package com.juggleflow.backend.exception;

import org.springframework.dao.DataIntegrityViolationException;

import java.sql.SQLException;

/** Détection portable des violations d'intégrité (SQLState 23505, noms de contraintes). */
public final class DataIntegrityViolations {

  private static final String UNIQUE_VIOLATION_SQL_STATE = "23505";

  private DataIntegrityViolations() {}

  public static boolean isDuplicateEmailViolation(DataIntegrityViolationException ex) {
    if (!isUniqueViolation(ex)) {
      return false;
    }
    return messageIndicates(ex, "email", "users_email");
  }

  public static boolean isUserTrickRace(DataIntegrityViolationException ex) {
    if (!isUniqueViolation(ex)) {
      return false;
    }
    return messageIndicates(ex, "uq_user_trick", "user_trick");
  }

  private static boolean isUniqueViolation(Throwable ex) {
    SQLException sql = findSqlException(ex);
    return sql != null && UNIQUE_VIOLATION_SQL_STATE.equals(sql.getSQLState());
  }

  private static boolean messageIndicates(Throwable ex, String... needles) {
    String haystack = collectMessages(ex).toLowerCase();
    for (String needle : needles) {
      if (haystack.contains(needle.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private static String collectMessages(Throwable ex) {
    StringBuilder sb = new StringBuilder();
    Throwable current = ex;
    while (current != null) {
      if (current.getMessage() != null) {
        sb.append(current.getMessage()).append(' ');
      }
      current = current.getCause();
    }
    return sb.toString();
  }

  private static SQLException findSqlException(Throwable ex) {
    Throwable current = ex;
    while (current != null) {
      if (current instanceof SQLException sql) {
        return sql;
      }
      current = current.getCause();
    }
    return null;
  }
}
