package hu.inf.unideb.neptun.model;

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
public class Student {
    @Id
    @EqualsAndHashCode.Include
    private String neptun;
    @NotBlank
    @Size(min = 3, max = 100)
    private String name;
    @Enumerated(EnumType.STRING)
    @NotNull
    private Program program;
    private OffsetDateTime created;
    private OffsetDateTime updated;

}
