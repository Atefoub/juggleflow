package com.juggleflow.backend.security;

import com.juggleflow.backend.model.User;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/** UserDetails portant l'entité {@link User} pour éviter un second fetch après authentification. */
@Getter
@RequiredArgsConstructor
public class JuggleflowUserDetails implements UserDetails {

  private final User user;

  @Override
  public String getUsername() {
    return user.getEmail();
  }

  @Override
  public String getPassword() {
    return user.getPassword();
  }

  @Override
  public boolean isEnabled() {
    return user.isEnabled();
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority(user.getRole()));
  }
}
