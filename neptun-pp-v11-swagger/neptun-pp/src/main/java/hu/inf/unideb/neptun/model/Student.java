package hu.inf.unideb.neptun.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@With
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Entity
@Schema(description = "Hallgató")
public class Student {
    @Id
    @EqualsAndHashCode.Include
    @Schema(description = "Neptun-kód: létrehozáskor a szerver generálja, módosításkor ez azonosítja a hallgatót",
            example = "ABC123")
    private String neptun;
    @NotBlank
    @Size(min = 3, max = 100)
    @Schema(description = "Teljes név", example = "Minta Márton")
    private String name;
    @Enumerated(EnumType.STRING)
    @NotNull
    @Schema(description = "Szak", example = "CS_BSC")
    private Program program;
    @Schema(description = "Létrehozás ideje", accessMode = Schema.AccessMode.READ_ONLY)
    private OffsetDateTime created;
    @Schema(description = "Utolsó módosítás ideje", accessMode = Schema.AccessMode.READ_ONLY)
    private OffsetDateTime updated;

}
