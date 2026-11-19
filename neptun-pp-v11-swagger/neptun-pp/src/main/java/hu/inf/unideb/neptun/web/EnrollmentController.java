package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Enrollment;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Tag(name = "Tárgyfelvételek")
public interface EnrollmentController {

    @Operation(summary = "Az összes tárgyfelvétel",
            description = "Minden tárgyfelvételben benne van a teljes hallgató és tárgy objektum.")
    @GetMapping("/api/enrollment")
    List<Enrollment> getAll();
}
