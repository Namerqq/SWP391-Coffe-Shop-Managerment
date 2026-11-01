package com.example.project.dto.menu;
import java.util.List;
/** Empty list means not applicable; legacy preserves old M/L pricing until configured. */
public record ItemCustomization(List<String> sizes, String defaultSize,
        List<String> sugarLevels, String defaultSugar,
        List<String> iceLevels, String defaultIce, boolean legacy) {}
