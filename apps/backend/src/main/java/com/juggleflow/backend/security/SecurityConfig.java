package com.juggleflow.backend.security;

import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Chaîne de sécurité Spring : API stateless JWT, headers HTTP, CORS strict,
 * Swagger conditionnel ({@code swagger.public}), rate limiting avant JWT.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtFilter jwtFilter;
  private final RateLimitFilter rateLimitFilter;
  private final UserRepository userRepository;

  @Value("${cors.allowed-origins}")
  private String allowedOrigins;

  @Value("${cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS,PATCH}")
  private String allowedMethods;

  @Value("${cors.allowed-headers:Authorization,Content-Type,Accept}")
  private String allowedHeaders;

  @Value("${cors.exposed-headers:Retry-After}")
  private String exposedHeaders;

  /** true = Swagger public (dev) ; false = ROLE_ADMINISTRATEUR (prod). */
  @Value("${swagger.public:false}")
  private boolean swaggerPublic;

  /** Routes publiques (auth, health). Logout/refresh sans Bearer : cookie httpOnly. */
  private static final String[] PUBLIC_ROUTES = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/juggling-lab/**",
    "/actuator/health"
  };

  private static final String[] SWAGGER_ROUTES = {
    "/v3/api-docs/**",
    "/swagger-ui/**",
    "/swagger-ui.html"
  };

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
      .csrf(AbstractHttpConfigurer::disable)

      .cors(cors -> cors.configurationSource(corsConfigurationSource()))

      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

      .headers(headers -> headers
        .contentTypeOptions(c -> {})
        .frameOptions(frame -> frame.deny())
        .httpStrictTransportSecurity(hsts -> hsts
          .includeSubDomains(true)
          .maxAgeInSeconds(31536000))
        .referrerPolicy(referrer -> referrer
          .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
        .contentSecurityPolicy(csp -> csp.policyDirectives(
          "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self'; " +
            "frame-ancestors 'none'; " +
            "form-action 'self';"
        ))
        .addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter(
          "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"
        ))
        .addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter(
          "Cross-Origin-Opener-Policy", "same-origin"
        ))
        .addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter(
          "Cross-Origin-Resource-Policy", "same-origin"
        ))
      )

      .authorizeHttpRequests(auth -> auth
        .requestMatchers(PUBLIC_ROUTES).permitAll()

        .requestMatchers(SWAGGER_ROUTES).access(swaggerAuthorizationManager())

        .requestMatchers("/api/admin/**")
        .hasAuthority("ROLE_ADMINISTRATEUR")

        .requestMatchers("/api/enseignant/**", "/api/classes/**")
        .hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMINISTRATEUR")

        .anyRequest().authenticated()
      )

      .authenticationProvider(authenticationProvider())

      .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
      .addFilterBefore(rateLimitFilter, JwtFilter.class)

      .build();
  }

  private AuthorizationManager<RequestAuthorizationContext> swaggerAuthorizationManager() {
    if (swaggerPublic) {
      return (authentication, context) -> new AuthorizationDecision(true);
    }
    return AuthorityAuthorizationManager.hasAuthority("ROLE_ADMINISTRATEUR");
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();

    List<String> origins = List.of(allowedOrigins.split(","));
    origins.forEach(origin -> {
      if ("*".equals(origin.trim())) {
        throw new IllegalStateException(
          "cors.allowed-origins ne peut pas contenir '*' avec allowCredentials=true");
      }
    });

    config.setAllowedOrigins(origins);
    config.setAllowedMethods(splitCsv(allowedMethods));
    config.setAllowedHeaders(splitCsv(allowedHeaders));
    config.setExposedHeaders(splitCsv(exposedHeaders));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  private static List<String> splitCsv(String csv) {
    if (csv == null || csv.isBlank()) return List.of();
    return List.of(csv.split(",")).stream()
      .map(String::trim)
      .filter(s -> !s.isBlank())
      .toList();
  }

  @Bean
  public UserDetailsService userDetailsService() {
    return email -> userRepository.findByEmail(email)
      .map(user -> new org.springframework.security.core.userdetails.User(
        user.getEmail(),
        user.getPassword(),
        user.isEnabled(),
        true, true, true,
        List.of(new SimpleGrantedAuthority(user.getRole()))
      ))
      .orElseThrow(() -> new UsernameNotFoundException("Identifiants invalides"));
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  public AuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
    provider.setUserDetailsService(userDetailsService());
    provider.setPasswordEncoder(passwordEncoder());
    return provider;
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
    throws Exception {
    return config.getAuthenticationManager();
  }
}
