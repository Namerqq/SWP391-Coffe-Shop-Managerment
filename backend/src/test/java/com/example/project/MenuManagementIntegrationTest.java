package com.example.project;
import com.example.project.entity.User;
import com.example.project.repository.UserRepository;
import com.example.project.repository.RoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.project.security.TokenStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Chạy với RUN_MENU_DB_TESTS=true trên MySQL local có đủ schema FREEZE + hai cột Menu Iter 2.
 * Mỗi test rollback transaction; không thay đổi menu hay đơn hiện có. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="RUN_MENU_DB_TESTS", matches="true")
class MenuManagementIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired TokenStore tokens;
    @Autowired RoleRepository roles;
    @Autowired PasswordEncoder passwords;
    String auth;
    final List<Path> uploaded=new ArrayList<>();
    @BeforeEach void setup() {
        User manager = testUser("MANAGER");
        auth="Bearer "+tokens.create(manager.getId(),30);
    }
    // Tài khoản chỉ tồn tại trong transaction của từng test và được rollback.
    private User testUser(String roleName) {
        String name = "menu-test-" + UUID.randomUUID();
        User user = new User();
        user.setRole(roles.findByName(roleName).orElseThrow());
        user.setUsername(name);
        user.setEmail(name + "@example.test");
        user.setFullName("Menu integration test");
        user.setPasswordHash(passwords.encode(UUID.randomUUID().toString()));
        return users.saveAndFlush(user);
    }
    @AfterEach void cleanup() throws Exception { for (Path p:uploaded) Files.deleteIfExists(p); }
    long category(String type) throws Exception {
        String content=json.writeValueAsString(Map.of("name","TEST-"+UUID.randomUUID(),"categoryType",type));
        return json.readTree(mvc.perform(post("/api/manager/menu/categories").header("Authorization",auth).contentType("application/json").content(content)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).get("id").asLong();
    }
    Map<String,Object> item(long cat,String name,long price) {
        return new HashMap<>(Map.of("name",name,"categoryId",cat,"basePrice",price));
    }
    long create(Map<String,Object> data) throws Exception {
        return json.readTree(mvc.perform(post("/api/manager/menu/items").header("Authorization",auth).contentType("application/json").content(json.writeValueAsString(data))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).get("id").asLong();
    }
    String guest() throws Exception { return mvc.perform(get("/api/public/order/menu")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8); }
    @Test void crudAvailabilityCategoryMoveAndGuestMenu() throws Exception {
        long cat=category("FOOD"),other=category("FOOD"); String name="Bánh TEST-"+UUID.randomUUID();
        var data=item(cat,name,18000);long id=create(data);
        assertTrue(guest().contains(name));
        mvc.perform(delete("/api/manager/menu/categories/"+cat).header("Authorization",auth)).andExpect(status().isConflict());
        mvc.perform(patch("/api/manager/menu/items/"+id+"/availability").header("Authorization",auth).contentType("application/json").content("{\"available\":false}")).andExpect(status().isOk());
        assertFalse(guest().contains(name));
        data.put("basePrice",25000);data.put("categoryId",other);
        mvc.perform(put("/api/manager/menu/items/"+id).header("Authorization",auth).contentType("application/json").content(json.writeValueAsString(data))).andExpect(status().isOk()).andExpect(jsonPath("$.basePrice").value(25000));
        mvc.perform(delete("/api/manager/menu/categories/"+cat).header("Authorization",auth)).andExpect(status().isOk());
        mvc.perform(patch("/api/manager/menu/items/"+id+"/availability").header("Authorization",auth).contentType("application/json").content("{\"available\":true}")).andExpect(status().isOk());
        assertTrue(guest().contains(name));
        mvc.perform(delete("/api/manager/menu/items/"+id).header("Authorization",auth)).andExpect(status().isOk());
        assertFalse(guest().contains(name));
        mvc.perform(delete("/api/manager/menu/categories/"+other).header("Authorization",auth)).andExpect(status().isOk());
    }
    @Test void standaloneToppingDoesNotAffectAverage() throws Exception {
        long cat=category("TOPPING");
        long before=json.readTree(mvc.perform(get("/api/manager/menu").header("Authorization",auth)).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).at("/stats/averagePrice").asLong();
        String name="Kem TEST-"+UUID.randomUUID();create(item(cat,name,10000));
        assertTrue(guest().contains(name));
        mvc.perform(get("/api/manager/menu").header("Authorization",auth)).andExpect(jsonPath("$.stats.averagePrice").value(before));
    }
    @Test void editingCategoryTypeChangesOptionsAndAverage() throws Exception {
        long cat=category("TOPPING");String name="TEST-"+UUID.randomUUID();create(item(cat,name,10000));
        var before=json.readTree(guest());
        assertTrue(before.get("toppings").toString().contains(name));
        mvc.perform(put("/api/manager/menu/categories/"+cat).header("Authorization",auth).contentType("application/json")
            .content(json.writeValueAsString(Map.of("name","TEST-"+UUID.randomUUID(),"categoryType","FOOD"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.categoryType").value("FOOD"));
        var after=json.readTree(guest());
        assertFalse(after.get("toppings").toString().contains(name));assertTrue(after.get("categories").toString().contains(name));
        var managed=json.readTree(mvc.perform(get("/api/manager/menu").header("Authorization",auth)).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        assertFalse(managed.get("categories").toString().contains("\"SIZE\""));
        long sum=0,count=0;
        Map<Long,String> types=new HashMap<>();
        for (var group:managed.get("categories")) types.put(group.get("id").asLong(),group.get("categoryType").asText());
        for (var it:managed.get("items")) {
            String type=types.get(it.get("categoryId").asLong());
            if("DRINK".equals(type)||"FOOD".equals(type)){sum+=it.get("basePrice").asLong();count++;}
        }
        assertEquals(Math.round((double)sum/count),managed.at("/stats/averagePrice").asLong());
    }
    @Test void managerImageUploadAndSave() throws Exception {
        byte[] png=Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=");
        String url=json.readTree(mvc.perform(multipart("/api/manager/menu/images").file(new MockMultipartFile("file","test.png","image/png",png)).header("Authorization",auth)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).get("url").asText();
        Path path=Path.of("uploads",url.substring("/uploads/".length()));uploaded.add(path);assertTrue(Files.exists(path));
        var data=item(category("DRINK"),"TEST-"+UUID.randomUUID(),35000);data.put("imageUrl",url);create(data);
        mvc.perform(multipart("/api/manager/menu/images").file(new MockMultipartFile("file","fake.png","image/png","fake".getBytes())).header("Authorization",auth)).andExpect(status().isBadRequest());
    }
    @Test void unauthorizedAndInvalidPriceAreRejected() throws Exception {
        mvc.perform(get("/api/manager/menu")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/manager/menu/items").header("Authorization",auth).contentType("application/json").content(json.writeValueAsString(item(category("DRINK"),"Invalid",-1)))).andExpect(status().isBadRequest());
        User nonManager = testUser("ADMIN");
        mvc.perform(get("/api/manager/menu").header("Authorization","Bearer "+tokens.create(nonManager.getId(),30))).andExpect(status().isForbidden());
    }
}
