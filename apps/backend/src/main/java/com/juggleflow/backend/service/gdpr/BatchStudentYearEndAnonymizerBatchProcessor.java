package com.juggleflow.backend.service.gdpr;

import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Traite un lot d'élèves dans sa propre transaction (évite un verrou monolithique). */
@Component
@RequiredArgsConstructor
class BatchStudentYearEndAnonymizerBatchProcessor {

  private static final String DELETED_EMAIL_SUFFIX = "@deleted.juggleflow.fr";
  private static final String ANONYMIZED_NAME = "[supprimé]";

  private final StudentRepository studentRepository;

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public int anonymizeBatch(List<Student> students) {
    int count = 0;
    for (Student student : students) {
      student.setEmail(UUID.randomUUID() + DELETED_EMAIL_SUFFIX);
      student.setFirstName(ANONYMIZED_NAME);
      student.setLastName(ANONYMIZED_NAME);
      student.setEnabled(false);
      student.setSchoolClass(null);
      studentRepository.save(student);
      count++;
    }
    return count;
  }
}
