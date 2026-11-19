package hu.inf.unideb.neptun.repository;

import hu.inf.unideb.neptun.model.Student;
import lombok.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentRepository
        extends JpaRepository<Student, String> {

}
