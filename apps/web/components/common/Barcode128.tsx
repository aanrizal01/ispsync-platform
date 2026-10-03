"use client";

import React, { useMemo } from "react";

// Standard Code 128 Symbol Patterns (Index 0 to 106)
// Each 6-digit string represents [bar1, space1, bar2, space2, bar3, space3] widths.
// Stop code (index 106) has 7 digits: [bar1, space1, bar2, space2, bar3, space3, bar4].
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                                 // 100-106
];

const START_CODE_B = 104;
const STOP_CODE = 106;
const QUIET_ZONE_MODULES = 10;

interface Barcode128Props {
  value: string;
  width?: number; // module width in px
  height?: number; // height in px
  displayValue?: boolean;
  fontSize?: number;
  barColor?: string;
  backgroundColor?: string;
  className?: string;
  caption?: string;
}

export function Barcode128({
  value,
  width = 1.4,
  height = 42,
  displayValue = true,
  fontSize = 11,
  barColor = "#000000",
  backgroundColor = "transparent",
  className = "",
  caption,
}: Barcode128Props) {
  const barcodeData = useMemo(() => {
    if (!value || typeof value !== "string") {
      return null;
    }

    const cleanStr = value.trim();
    if (cleanStr.length === 0) return null;

    // Convert string to character values for Code 128 Subset B
    const codes: number[] = [START_CODE_B];
    let checksum = START_CODE_B;

    for (let i = 0; i < cleanStr.length; i++) {
      const charCode = cleanStr.charCodeAt(i);
      // Valid range in Code 128 B is ASCII 32 to 127
      const val = charCode >= 32 && charCode <= 127 ? charCode - 32 : 0;
      codes.push(val);
      checksum += val * (i + 1);
    }

    codes.push(checksum % 103);
    codes.push(STOP_CODE);

    // Build bar rects
    let currentX = QUIET_ZONE_MODULES * width;
    const rects: { x: number; width: number }[] = [];

    for (const code of codes) {
      const pattern = CODE128_PATTERNS[code];
      if (!pattern) continue;

      for (let j = 0; j < pattern.length; j++) {
        const moduleCount = parseInt(pattern[j], 10);
        const barWidth = moduleCount * width;
        const isBar = j % 2 === 0;

        if (isBar) {
          rects.push({
            x: Math.round(currentX * 100) / 100,
            width: Math.round(barWidth * 100) / 100,
          });
        }
        currentX += barWidth;
      }
    }

    const totalWidth = Math.round((currentX + QUIET_ZONE_MODULES * width) * 100) / 100;

    return {
      rects,
      totalWidth,
      text: cleanStr,
    };
  }, [value, width]);

  if (!barcodeData) {
    return null;
  }

  const svgHeight = height + (displayValue ? fontSize + 8 : 0);

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={barcodeData.totalWidth}
        height={svgHeight}
        viewBox={`0 0 ${barcodeData.totalWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ backgroundColor }}
        className="block"
      >
        {/* Barcode Bars */}
        <g fill={barColor}>
          {barcodeData.rects.map((rect, idx) => (
            <rect
              key={idx}
              x={rect.x}
              y={0}
              width={rect.width}
              height={height}
            />
          ))}
        </g>

        {/* Human Readable Value Text */}
        {displayValue && (
          <text
            x={barcodeData.totalWidth / 2}
            y={height + fontSize + 2}
            textAnchor="middle"
            fill={barColor}
            fontSize={fontSize}
            fontFamily="monospace, ui-monospace, SFMono-Regular, Courier New"
            fontWeight="bold"
            letterSpacing="0.08em"
          >
            {barcodeData.text}
          </text>
        )}
      </svg>

      {caption && (
        <span className="text-[9.5px] font-medium text-slate-500 uppercase tracking-wider mt-0.5 text-center">
          {caption}
        </span>
      )}
    </div>
  );
}
