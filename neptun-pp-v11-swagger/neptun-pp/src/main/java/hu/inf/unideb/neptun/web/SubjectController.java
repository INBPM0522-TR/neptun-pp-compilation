package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Subject;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Tag(name = "Tárgyak")
public interface SubjectController {

    @Operation(summary = "Az összes tárgy")
    @GetMapping("/api/subject")
    List<Subject> getAll();
}
