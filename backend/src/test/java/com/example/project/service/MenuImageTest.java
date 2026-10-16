package com.example.project.service;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.example.project.exception.ApiException;
class MenuImageTest {
    final FileStorageService service=new FileStorageService("unused-test-folder");
    @Test void acceptsPngSignature() { assertDoesNotThrow(()->service.validateMenuImage(new MockMultipartFile("file","photo.png","image/png",new byte[]{(byte)137,80,78,71,13,10,26,10}))); }
    @Test void rejectsFakeImageAndGif() {
        assertThrows(ApiException.class,()->service.validateMenuImage(new MockMultipartFile("file","photo.png","image/png","fake".getBytes())));
        assertThrows(ApiException.class,()->service.validateMenuImage(new MockMultipartFile("file","photo.gif","image/gif","GIF89a".getBytes())));
    }
    @Test void rejectsOverFiveMb() { assertThrows(ApiException.class,()->service.validateMenuImage(new MockMultipartFile("file","photo.png","image/png",new byte[5*1024*1024+1]))); }
}
