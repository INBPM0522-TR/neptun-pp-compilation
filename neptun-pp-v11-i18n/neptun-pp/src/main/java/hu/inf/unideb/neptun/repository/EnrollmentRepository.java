package hu.inf.unideb.neptun.repository;

import hu.inf.unideb.neptun.model.Enrollment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EnrollmentRepository
        extends JpaRepository<Enrollment, UUID> {

    /**
     * A student és a subject LAZY kapcsolat: alapból csak egy Hibernate proxy jönne,
     * amit a Jackson nem tud JSON-né alakítani. Az @EntityGraph miatt egyetlen
     * (JOIN-os) lekérdezéssel együtt töltődnek be.
     */
    @Override
    @EntityGraph(attributePaths = {"student", "subject"})
    List<Enrollment> findAll();
}
