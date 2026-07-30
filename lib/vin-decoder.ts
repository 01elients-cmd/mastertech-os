export interface VinVehicleData {
  vin: string;
  make: string;
  model: string;
  year: string;
  displacementL?: string;
  engineCylinders?: string;
  driveType?: string;
  fuelType?: string;
  transmissionStyle?: string;
  vehicleType?: string;
  plantCountry?: string;
  rawResults?: any;
}

/**
 * Decodifica un código VIN de 17 caracteres usando la API oficial NHTSA
 */
export async function decodeVin(vin: string): Promise<VinVehicleData | null> {
  const cleanVin = vin.trim().toUpperCase();
  if (!cleanVin || cleanVin.length !== 17) {
    return null;
  }

  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${cleanVin}?format=json`);
    if (!res.ok) return null;

    const data = await res.json();
    const result = data.Results && data.Results[0];

    if (!result) return null;

    return {
      vin: cleanVin,
      make: result.Make || 'Desconocido',
      model: result.Model || 'Desconocido',
      year: result.ModelYear || 'Desconocido',
      displacementL: result.DisplacementL || undefined,
      engineCylinders: result.EngineCylinders || undefined,
      driveType: result.DriveType || undefined,
      fuelType: result.FuelTypePrimary || undefined,
      transmissionStyle: result.TransmissionStyle || undefined,
      vehicleType: result.VehicleType || undefined,
      plantCountry: result.PlantCountry || undefined,
      rawResults: result
    };
  } catch (err) {
    console.error('Error al decodificar VIN:', err);
    return null;
  }
}
