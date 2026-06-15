package com.juggleflow.backend.service.gdpr;

import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

/**
 * Anonymisation paginée portable (H2 et autres SGBD sans {@code gen_random_uuid()}).
 * Chaque page est commitée dans sa propre transaction.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("'${spring.datasource.url:}'.toLowerCase().contains('jdbc:h2')")
public class BatchStudentYearEndAnonymizer implements StudentYearEndAnonymizer {

  private static final int BATCH_SIZE = 100;

  private final StudentRepository studentRepository;
  private final BatchStudentYearEndAnonymizerBatchProcessor batchProcessor;

  @Override
  public YearEndAnonymizationResult anonymizeBySchoolYear(int schoolYear) {
    int totalAnonymized = 0;
    int totalDetached = 0;
    int page = 0;
    Page<Student> batch;

    do {
      batch = studentRepository.findBySchoolClass_SchoolYear(
        schoolYear, PageRequest.of(page++, BATCH_SIZE));
      AnonymizationBatchResult result = batchProcessor.anonymizeBatch(batch.getContent());
      totalAnonymized += result.anonymized();
      totalDetached += result.detached();
    } while (batch.hasNext());

    return new YearEndAnonymizationResult(totalAnonymized, totalDetached);
  }
}
