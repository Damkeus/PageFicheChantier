import React from 'react';
import { Anchor, Cable, Package, Zap, LucideIcon } from 'lucide-react';
import {
  EXTRMITJPG_IMG,
  EXT_DROITE_DDIRECTEPNG_IMG,
  JONCTIONJPG_IMG,
  JONCTION_AVEC_ARRT_DCRANJPG_IMG,
  JONCTION_AVEC_MALTJPG_IMG,
} from '../../assets/assets';
import { AccessoryTypeKey } from '../../accessoryCatalog';

interface TypeVisual {
  /** Image du type (data URI). Prioritaire sur l'icône quand elle est renseignée. */
  image?: string;
  Icon: LucideIcon;
}

/**
 * Point unique de branchement des pictos par type d'élément.
 * Provisoire : symboles du schéma unifilaire ; à remplacer par les icônes définitives.
 */
export const TYPE_VISUALS: Record<AccessoryTypeKey, TypeVisual> = {
  extremite: { image: EXTRMITJPG_IMG, Icon: Zap },
  psem: { image: EXT_DROITE_DDIRECTEPNG_IMG, Icon: Zap },
  jonction: { image: JONCTIONJPG_IMG, Icon: Cable },
  jonction_ae: { image: JONCTION_AVEC_ARRT_DCRANJPG_IMG, Icon: Cable },
  jonction_malt: { image: JONCTION_AVEC_MALTJPG_IMG, Icon: Cable },
  support: { Icon: Anchor },
  malt: { Icon: Zap },
  autre: { Icon: Package },
};

const SIZES = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
} as const;

export const TypeThumb: React.FC<{
  type: AccessoryTypeKey;
  size?: keyof typeof SIZES;
  active?: boolean;
}> = ({ type, size = 'md', active = false }) => {
  const { image, Icon } = TYPE_VISUALS[type];
  return (
    <div
      className={`${SIZES[size]} flex-shrink-0 rounded-lg border flex items-center justify-center overflow-hidden transition-colors ${
        active ? 'border-[#A30026] bg-white' : 'border-gray-200 bg-[#faf8f6]'
      }`}
      aria-hidden
    >
      {image ? (
        <img src={image} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" />
      ) : (
        <Icon className={`w-1/2 h-1/2 ${active ? 'text-[#A30026]' : 'text-gray-500'}`} />
      )}
    </div>
  );
};
