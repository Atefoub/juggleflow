package com.juggleflow.backend.service.gdpr;

/** Anonymisation RGPD de fin d'année scolaire pour les élèves. */
public interface StudentYearEndAnonymizer {

  /**
   * Anonymise les élèves rattachés à une année scolaire donnée.
   */
  YearEndAnonymizationResult anonymizeBySchoolYear(int schoolYear);
}
