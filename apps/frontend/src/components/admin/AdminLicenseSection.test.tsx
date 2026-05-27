import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminLicenseSection from './AdminLicenseSection';

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    ...actual,
    isAxiosError: (e: unknown) => (e as { __isAxiosError?: boolean } | null)?.__isAxiosError === true,
  };
});

const getLicenseSettings = vi.fn();
const updateLicenseSettings = vi.fn();

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    getLicenseSettings: (...args: unknown[]) => getLicenseSettings(...args),
    updateLicenseSettings: (...args: unknown[]) => updateLicenseSettings(...args),
  },
}));

describe('AdminLicenseSection', () => {
  beforeEach(() => {
    getLicenseSettings.mockReset();
    updateLicenseSettings.mockReset();
  });

  it('loads and renders license settings', async () => {
    getLicenseSettings.mockResolvedValue({
      establishmentName: 'École Jules Ferry',
      licenseSeatCap: 60,
      licenseUsedCount: 12,
      licenseExpiresAt: '2026-06-30',
      licenseExpired: false,
      licenseAtCapacity: false,
    });

    render(<AdminLicenseSection />);

    expect(screen.getByText('Chargement de la licence…')).toBeTruthy();

    expect(await screen.findByText('Licence établissement')).toBeTruthy();
    expect(screen.getByText(/Utilisation/i)).toBeTruthy();
    expect(screen.getByText('12 / 60')).toBeTruthy();
    expect(screen.getByDisplayValue('60')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-06-30')).toBeTruthy();
  });

  it('updates license settings and calls onUpdated', async () => {
    const onUpdated = vi.fn();

    getLicenseSettings.mockResolvedValue({
      establishmentName: 'École Jules Ferry',
      licenseSeatCap: 60,
      licenseUsedCount: 12,
      licenseExpiresAt: null,
      licenseExpired: false,
      licenseAtCapacity: false,
    });

    updateLicenseSettings.mockResolvedValue({
      establishmentName: 'École Jules Ferry',
      licenseSeatCap: 80,
      licenseUsedCount: 12,
      licenseExpiresAt: '2027-12-31',
      licenseExpired: false,
      licenseAtCapacity: false,
    });

    const user = userEvent.setup();
    const { container } = render(<AdminLicenseSection onUpdated={onUpdated} />);

    await screen.findByText('Licence établissement');

    const seatCapInput = screen.getByLabelText('Plafond de sièges') as HTMLInputElement;
    await user.clear(seatCapInput);
    await user.type(seatCapInput, '80');

    const noExpiration = screen.getByLabelText("Pas de date d'expiration") as HTMLInputElement;
    expect(noExpiration.checked).toBe(true);
    await user.click(noExpiration);
    expect(noExpiration.checked).toBe(false);

    const expiresAtInput = container.querySelector('input[type="date"]') as HTMLInputElement | null;
    expect(expiresAtInput).toBeTruthy();
    if (!expiresAtInput) throw new Error('date input not found');
    await user.clear(expiresAtInput);
    await user.type(expiresAtInput, '2027-12-31');

    await user.click(screen.getByRole('button', { name: 'Enregistrer la licence' }));

    expect(updateLicenseSettings).toHaveBeenCalledWith({
      licenseSeatCap: 80,
      licenseExpiresAt: '2027-12-31',
    });

    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Licence mise à jour.')).toBeTruthy();
    expect(screen.getByText('12 / 80')).toBeTruthy();
  });

  it('displays server error message on update failure', async () => {
    getLicenseSettings.mockResolvedValue({
      establishmentName: 'École Jules Ferry',
      licenseSeatCap: 60,
      licenseUsedCount: 12,
      licenseExpiresAt: null,
      licenseExpired: false,
      licenseAtCapacity: false,
    });

    updateLicenseSettings.mockRejectedValue({
      __isAxiosError: true,
      response: { data: { message: 'Capacité invalide' } },
    });

    const user = userEvent.setup();
    render(<AdminLicenseSection />);
    await screen.findByText('Licence établissement');

    const seatCapInput = screen.getByLabelText('Plafond de sièges') as HTMLInputElement;
    await user.clear(seatCapInput);
    await user.type(seatCapInput, '80');

    await user.click(screen.getByRole('button', { name: 'Enregistrer la licence' }));

    expect(await screen.findByText('Capacité invalide')).toBeTruthy();
  });
});

