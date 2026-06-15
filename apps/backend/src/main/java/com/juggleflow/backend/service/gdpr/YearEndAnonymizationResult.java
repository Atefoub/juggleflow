package com.juggleflow.backend.service.gdpr;

/** Résultat de l'anonymisation RGPD de fin d'année scolaire. */
public record YearEndAnonymizationResult(int anonymized, int detached) {}
