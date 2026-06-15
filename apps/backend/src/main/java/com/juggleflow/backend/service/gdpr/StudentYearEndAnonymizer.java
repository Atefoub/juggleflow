package com.juggleflow.backend.service.gdpr;

/** Anonymisation RGPD de fin d'année scolaire pour les élèves. */
public interface StudentYearEndAnonymizer {

  /**
   * Anonymise les élèves rattachés à une année scolaire donnée.
   *
   * @return nombre de comptes élève traités
   */
  int anonymizeBySchoolYear(int schoolYear);
}
