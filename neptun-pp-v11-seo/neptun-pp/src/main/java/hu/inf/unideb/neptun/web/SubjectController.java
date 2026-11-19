package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Subject;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

public interface SubjectController {

    @GetMapping("/api/subject")
    List<Subject> getAll();
}
