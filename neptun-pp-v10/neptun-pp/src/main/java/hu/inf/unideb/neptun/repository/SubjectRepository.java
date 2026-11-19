package hu.inf.unideb.neptun.repository;

import hu.inf.unideb.neptun.model.Student;
import hu.inf.unideb.neptun.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubjectRepository
        extends JpaRepository<Subject, String> {

}
