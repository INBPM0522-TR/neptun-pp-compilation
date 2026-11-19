package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Enrollment;
import hu.inf.unideb.neptun.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class EnrollmentControllerImpl
        implements EnrollmentController {

    private final EnrollmentRepository repository;

    @Override
    public List<Enrollment> getAll() {
        return repository.findAll();
    }
}
