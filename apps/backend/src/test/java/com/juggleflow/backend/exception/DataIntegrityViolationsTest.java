package com.juggleflow.backend.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

class DataIntegrityViolationsTest {

    @Test
    @DisplayName("SQLState 23505 + contrainte email → violation email")
    void isDuplicateEmailViolation_detectsSqlState23505() {
        SQLException sql = new SQLException(
            "ERROR: duplicate key value violates unique constraint \"users_email_key\"",
            "23505");
        var ex = new DataIntegrityViolationException("could not execute statement", sql);

        assertThat(DataIntegrityViolations.isDuplicateEmailViolation(ex)).isTrue();
    }

    @Test
    @DisplayName("SQLState 23505 + contrainte user_trick → course upsertProgress")
    void isUserTrickRace_detectsSqlState23505() {
        SQLException sql = new SQLException(
            "ERROR: duplicate key value violates unique constraint \"uq_user_trick\"",
            "23505");
        var ex = new DataIntegrityViolationException("could not execute statement", sql);

        assertThat(DataIntegrityViolations.isUserTrickRace(ex)).isTrue();
        assertThat(DataIntegrityViolations.isDuplicateEmailViolation(ex)).isFalse();
    }

    @Test
    @DisplayName("SQLState non-unique → pas de violation email")
    void isDuplicateEmailViolation_rejectsOtherSqlStates() {
        SQLException sql = new SQLException("foreign key violation", "23503");
        var ex = new DataIntegrityViolationException("fk failure", sql);

        assertThat(DataIntegrityViolations.isDuplicateEmailViolation(ex)).isFalse();
    }
}
