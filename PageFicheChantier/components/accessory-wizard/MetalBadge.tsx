import React from 'react';
import { Metal } from '../../accessoryCatalog';

/**
 * Couleur = matière : gris acier pour l'aluminium, cuivré pour le cuivre. Le cuivre émaillé
 * reprend le cuivre avec un contour marqué, pour rester lisible sans inventer une 3ᵉ teinte.
 */
const METAL_STYLES: Record<Metal, string> = {
  Al: 'bg-[#e8ebee] text-[#4a5560] border-[#c8d0d8]',
  Cu: 'bg-[#f8e3d2] text-[#8a4a1d] border-[#dda877]',
  CuE: 'bg-[#f8e3d2] text-[#6d3a16] border-[#b06a2c] border-dashed',
};

const SIZES = {
  sm: 'px-1.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
} as const;

export const MetalBadge: React.FC<{ metal: Metal; size?: keyof typeof SIZES }> = ({ metal, size = 'md' }) => (
  <span
    title={metal === 'CuE' ? 'Cuivre émaillé' : metal === 'Cu' ? 'Cuivre' : 'Aluminium'}
    className={`inline-block rounded border font-bold uppercase tracking-wide ${SIZES[size]} ${METAL_STYLES[metal]}`}
  >
    {metal}
  </span>
);
