package com.juggleflow.backend.service.gdpr;

/** Résultat d'un lot d'anonymisation (comptes traités vs classes détachées). */
record AnonymizationBatchResult(int anonymized, int detached) {}
