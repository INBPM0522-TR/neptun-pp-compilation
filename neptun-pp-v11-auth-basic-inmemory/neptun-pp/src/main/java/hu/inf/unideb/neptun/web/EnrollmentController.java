package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Enrollment;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

public interface EnrollmentController {

    @GetMapping("/api/enrollment")
    List<Enrollment> getAll();
}
