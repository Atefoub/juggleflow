package com.juggleflow.backend.service.gdpr;

import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Anonymisation paginée portable (H2 et autres SGBD sans {@code gen_random_uuid()}).
 */
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("'${spring.datasource.url:}'.toLowerCase().contains('jdbc:h2')")
public class BatchStudentYearEndAnonymizer implements StudentYearEndAnonymizer {

  private static final String DELETED_EMAIL_SUFFIX = "@deleted.juggleflow.fr";
  private static final String ANONYMIZED_NAME = "[supprimé]";
  private static final int BATCH_SIZE = 100;

  private final StudentRepository studentRepository;

  @Override
  @Transactional
  public int anonymizeBySchoolYear(int schoolYear) {
    int count = 0;
    int page = 0;
    Page<Student> batch;

    do {
      batch = studentRepository.findBySchoolClass_SchoolYear(
        schoolYear, PageRequest.of(page++, BATCH_SIZE));
      for (Student student : batch) {
        student.setEmail(UUID.randomUUID() + DELETED_EMAIL_SUFFIX);
        student.setFirstName(ANONYMIZED_NAME);
        student.setLastName(ANONYMIZED_NAME);
        student.setEnabled(false);
        student.setSchoolClass(null);
        studentRepository.save(student);
        count++;
      }
    } while (batch.hasNext());

    return count;
  }
}
