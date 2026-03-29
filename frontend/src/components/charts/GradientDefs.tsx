/**
 * GradientDefs — drop this once inside any Recharts <AreaChart> or <ComposedChart>
 * as a child of <defs>. All area fills reference these gradient IDs.
 *
 * Usage:
 *   <AreaChart ...>
 *     <defs>
 *       <GradientDefs />
 *     </defs>
 *     <Area fill="url(#gradRent)" stroke={seriesConfig.rent.color} ... />
 *   </AreaChart>
 */

import { areaGradients } from '../../theme';

export default function GradientDefs() {
  return (
    <>
      {Object.values(areaGradients).map(({ id, startColor, endColor }) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={startColor} stopOpacity={1} />
          <stop offset="95%" stopColor={endColor} stopOpacity={0} />
        </linearGradient>
      ))}
    </>
  );
}
