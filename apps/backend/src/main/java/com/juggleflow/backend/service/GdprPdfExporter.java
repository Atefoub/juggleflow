package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.ConsentStatusResponse;
import com.juggleflow.backend.model.GdprConsent.ConsentStatus;
import com.juggleflow.backend.model.SchoolClass;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Generation du registre PDF des consentements RGPD pour une classe.
 *
 * Isole de {@link GdprService} pour :
 *   - cantonner la dependance OpenPDF a un seul fichier (facilite un eventuel
 *     remplacement de moteur PDF) ;
 *   - rendre le formatage testable sans mocker tout le contexte JPA.
 */
@Component
public class GdprPdfExporter {

    private static final DateTimeFormatter DATE_FORMAT =
        DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.FRENCH);
    private static final DateTimeFormatter DATE_TIME_FORMAT =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.FRENCH);
    private static final ZoneId ZONE_PARIS = ZoneId.of("Europe/Paris");

    private static final Color BRAND_PURPLE = new Color(91, 32, 230);
    private static final Color HEADER_BG = new Color(243, 240, 252);
    private static final Color ROW_ALT_BG = new Color(250, 249, 254);
    private static final Color STATUS_VALID = new Color(20, 138, 73);
    private static final Color STATUS_EXPIRED = new Color(220, 130, 0);
    private static final Color STATUS_MISSING = new Color(200, 35, 51);

    /**
     * Genere le PDF binaire du registre.
     *
     * @param schoolClass classe concernee (utilise pour le titre / metadata).
     * @param rows        lignes de statut deja calculees par GdprService.
     * @param policyVersion version courante de la politique (pour mention legale).
     * @return le PDF binaire (pret a streamer dans la reponse HTTP).
     */
    public byte[] export(SchoolClass schoolClass,
                         List<ConsentStatusResponse> rows,
                         String policyVersion) {

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 54);
            PdfWriter.getInstance(document, out);
            document.addTitle("Registre RGPD - " + schoolClass.getName());
            document.addCreator("JuggleFlow");
            document.addSubject("Registre des consentements parentaux RGPD");

            document.open();

            document.add(buildTitle("Registre des consentements RGPD"));
            document.add(buildSubtitle(schoolClass));
            document.add(buildMetaLine(rows, policyVersion));
            document.add(buildTable(rows));
            document.add(buildLegalFooter(policyVersion));

            document.close();
            return out.toByteArray();
        } catch (DocumentException | java.io.IOException e) {
            throw new IllegalStateException("Generation PDF impossible", e);
        }
    }

    private Paragraph buildTitle(String text) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, BRAND_PURPLE);
        Paragraph p = new Paragraph(text, font);
        p.setAlignment(Element.ALIGN_LEFT);
        p.setSpacingAfter(4f);
        return p;
    }

    private Paragraph buildSubtitle(SchoolClass schoolClass) {
        String year = schoolClass.getSchoolYear() != null
            ? String.valueOf(schoolClass.getSchoolYear()) : "—";
        String label = String.format(Locale.FRENCH,
            "Classe : %s (%s · annee scolaire %s)",
            schoolClass.getName(),
            schoolClass.getSchoolLevel() != null ? schoolClass.getSchoolLevel() : "—",
            year);
        Paragraph p = new Paragraph(label,
            FontFactory.getFont(FontFactory.HELVETICA, 12, Color.DARK_GRAY));
        p.setSpacingAfter(2f);
        return p;
    }

    private Paragraph buildMetaLine(List<ConsentStatusResponse> rows, String policyVersion) {
        long valid = rows.stream().filter(r -> r.getStatus() == ConsentStatus.VALID).count();
        long expired = rows.stream().filter(r -> r.getStatus() == ConsentStatus.EXPIRED).count();
        long missing = rows.stream()
            .filter(r -> r.getStatus() == ConsentStatus.MISSING
                      || r.getStatus() == ConsentStatus.REVOKED).count();

        String summary = String.format(Locale.FRENCH,
            "Edite le %s · Politique en vigueur : %s · %d valides / %d expires / %d manquants (sur %d eleves)",
            DATE_TIME_FORMAT.format(Instant.now().atZone(ZONE_PARIS)),
            policyVersion,
            valid, expired, missing, rows.size());

        Paragraph p = new Paragraph(summary,
            FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY));
        p.setSpacingAfter(16f);
        return p;
    }

    private PdfPTable buildTable(List<ConsentStatusResponse> rows) throws DocumentException {
        PdfPTable table = new PdfPTable(new float[] { 3.5f, 1.8f, 1.7f, 1.5f, 1.7f });
        table.setWidthPercentage(100);
        table.setSpacingBefore(4f);
        table.setSpacingAfter(8f);
        table.setHeaderRows(1);

        addHeaderCell(table, "Eleve");
        addHeaderCell(table, "Statut");
        addHeaderCell(table, "Date de saisie");
        addHeaderCell(table, "Politique");
        addHeaderCell(table, "Expire le");

        int idx = 0;
        for (ConsentStatusResponse r : rows) {
            Color bg = (idx++ % 2 == 0) ? Color.WHITE : ROW_ALT_BG;
            String fullName = (r.getLastName() == null ? "" : r.getLastName().toUpperCase(Locale.FRENCH))
                + " " + (r.getFirstName() == null ? "" : r.getFirstName());
            addBodyCell(table, fullName.trim().isEmpty() ? "—" : fullName.trim(), bg);
            addStatusCell(table, r.getStatus(), bg);
            addBodyCell(table, formatInstant(r.getConsentDate()), bg);
            addBodyCell(table, r.getPolicyVersion() != null ? r.getPolicyVersion() : "—", bg);
            addBodyCell(table, formatInstant(r.getExpiresAt()), bg);
        }

        if (rows.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("Aucun eleve dans cette classe.",
                FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, Color.GRAY)));
            empty.setColspan(5);
            empty.setHorizontalAlignment(Element.ALIGN_CENTER);
            empty.setPadding(12f);
            table.addCell(empty);
        }
        return table;
    }

    private Paragraph buildLegalFooter(String policyVersion) {
        String text =
            "JuggleFlow - Donnees hebergees en France. Politique de confidentialite version "
            + policyVersion + ". Pour toute question, contacter le DPO : dpo@juggleflow.fr.";
        Paragraph p = new Paragraph(text,
            FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.GRAY));
        p.setSpacingBefore(24f);
        return p;
    }

    private void addHeaderCell(PdfPTable table, String label) {
        PdfPCell cell = new PdfPCell(new Phrase(label,
            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, BRAND_PURPLE)));
        cell.setBackgroundColor(HEADER_BG);
        cell.setBorderColor(Color.LIGHT_GRAY);
        cell.setPadding(8f);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    private void addBodyCell(PdfPTable table, String value, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(value,
            FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY)));
        cell.setBackgroundColor(bg);
        cell.setBorderColor(Color.LIGHT_GRAY);
        cell.setPadding(6f);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    private void addStatusCell(PdfPTable table, ConsentStatus status, Color bg) {
        Color color = switch (status) {
            case VALID -> STATUS_VALID;
            case EXPIRED -> STATUS_EXPIRED;
            case REVOKED, MISSING -> STATUS_MISSING;
        };
        String label = switch (status) {
            case VALID -> "Valide";
            case EXPIRED -> "Expire";
            case REVOKED -> "Revoque";
            case MISSING -> "Manquant";
        };
        PdfPCell cell = new PdfPCell(new Phrase(label,
            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, color)));
        cell.setBackgroundColor(bg);
        cell.setBorderColor(Color.LIGHT_GRAY);
        cell.setPadding(6f);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    private String formatInstant(Instant instant) {
        if (instant == null) return "—";
        LocalDate date = instant.atZone(ZONE_PARIS).toLocalDate();
        return DATE_FORMAT.format(date);
    }
}
