package com.juggleflow.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilsTest {

    private JwtUtils jwtUtils;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils(
            "TestSecretKeyTresLongueMinimum32CaractersPourLesTests2026",
            900_000L,
            604_800_000L
        );
    }

    @Test
    @DisplayName("generateToken → token JWT valide débutant par eyJ")
    void generateToken_shouldReturnValidJwt() {
        UserDetails user = buildUser("alice@test.fr", "ROLE_ELEVE");
        String token = jwtUtils.generateToken(user);
        assertThat(token).isNotBlank().startsWith("eyJ");
    }

    @Test
    @DisplayName("extractEmail → retourne l'email du subject")
    void extractEmail_shouldReturnCorrectEmail() {
        UserDetails user = buildUser("bob@test.fr", "ROLE_ENSEIGNANT");
        String token = jwtUtils.generateToken(user);
        assertThat(jwtUtils.extractEmail(token)).isEqualTo("bob@test.fr");
    }

    @Test
    @DisplayName("isTokenValid → true pour token valide")
    void isTokenValid_shouldReturnTrue_forValidToken() {
        UserDetails user = buildUser("carol@test.fr", "ROLE_ADMIN");
        String token = jwtUtils.generateToken(user);
        assertThat(jwtUtils.isTokenValid(token, user)).isTrue();
    }

    @Test
    @DisplayName("isTokenValid → false si email ne correspond pas")
    void isTokenValid_shouldReturnFalse_whenEmailMismatch() {
        UserDetails user1 = buildUser("user1@test.fr", "ROLE_ELEVE");
        UserDetails user2 = buildUser("user2@test.fr", "ROLE_ELEVE");
        String token = jwtUtils.generateToken(user1);
        assertThat(jwtUtils.isTokenValid(token, user2)).isFalse();
    }

    @Test
    @DisplayName("isTokenValid → false pour token invalide")
    void isTokenValid_shouldReturnFalse_forGarbageToken() {
        UserDetails user = buildUser("dave@test.fr", "ROLE_ELEVE");
        assertThat(jwtUtils.isTokenValid("token.invalide.ici", user)).isFalse();
    }

    @Test
    @DisplayName("Constructeur → exception si secret trop court")
    void constructor_shouldThrow_whenSecretTooShort() {
        assertThatThrownBy(() -> new JwtUtils("court", 900_000L, 604_800_000L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("JWT_SECRET");
    }

    @Test
    @DisplayName("generateRefreshToken → token différent du access token")
    void generateRefreshToken_shouldDifferFromAccessToken() {
        UserDetails user = buildUser("eve@test.fr", "ROLE_ELEVE");
        String access = jwtUtils.generateToken(user);
        String refresh = jwtUtils.generateRefreshToken(user);
        assertThat(access).isNotEqualTo(refresh);
    }

    private UserDetails buildUser(String email, String role) {
        return User.withUsername(email)
            .password("hashed")
            .authorities(role)
            .build();
    }
}
