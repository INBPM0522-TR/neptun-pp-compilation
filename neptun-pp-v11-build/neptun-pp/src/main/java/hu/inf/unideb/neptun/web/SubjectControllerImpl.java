package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Subject;
import hu.inf.unideb.neptun.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SubjectControllerImpl
        implements SubjectController {

    private final SubjectRepository repository;

    @Override
    public List<Subject> getAll() {
        return repository.findAll();
    }
}
