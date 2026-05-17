package com.juggleflow.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "establishment_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EstablishmentSettings {

    @Id
    private Long id;

    @Column(name = "establishment_name", nullable = false)
    private String establishmentName;

    @Column(name = "license_seat_cap", nullable = false)
    private int licenseSeatCap;

    @Column(name = "license_expires_at")
    private LocalDate licenseExpiresAt;
}
