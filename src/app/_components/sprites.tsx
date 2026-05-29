export function MoonSprite() {
	return (
		<svg
			aria-hidden="true"
			height="16"
			style={{ imageRendering: "pixelated" }}
			viewBox="0 0 8 8"
			width="16"
		>
			<rect fill="#f4a261" height="1" width="4" x="2" y="0" />
			<rect fill="#f4a261" height="1" width="4" x="1" y="1" />
			<rect fill="#f4a261" height="1" width="4" x="0" y="2" />
			<rect fill="#f4a261" height="2" width="3" x="0" y="3" />
			<rect fill="#f4a261" height="1" width="4" x="0" y="5" />
			<rect fill="#f4a261" height="1" width="4" x="1" y="6" />
			<rect fill="#f4a261" height="1" width="4" x="2" y="7" />
			<rect fill="#fce4b8" height="1" width="1" x="3" y="0" />
			<rect fill="#fce4b8" height="1" width="1" x="2" y="1" />
			<rect fill="#d96c4a" height="1" width="1" x="2" y="6" />
			<rect fill="#d96c4a" height="1" width="1" x="3" y="7" />
		</svg>
	);
}

export function SparkleSprite() {
	return (
		<svg
			aria-hidden="true"
			height="12"
			style={{ imageRendering: "pixelated" }}
			viewBox="0 0 9 9"
			width="12"
		>
			<rect fill="#f4a261" height="9" width="1" x="4" y="0" />
			<rect fill="#f4a261" height="1" width="9" x="0" y="4" />
			<rect fill="#f4a261" height="1" width="1" x="2" y="2" />
			<rect fill="#f4a261" height="1" width="1" x="6" y="2" />
			<rect fill="#f4a261" height="1" width="1" x="2" y="6" />
			<rect fill="#f4a261" height="1" width="1" x="6" y="6" />
			<rect fill="#fce4b8" height="1" width="1" x="4" y="4" />
		</svg>
	);
}

export function HatSprite() {
	return (
		<svg
			aria-hidden="true"
			height="16"
			style={{ imageRendering: "pixelated" }}
			viewBox="0 0 8 8"
			width="16"
		>
			<rect fill="#3d1f14" height="1" width="1" x="3" y="0" />
			<rect fill="#3d1f14" height="2" width="3" x="2" y="1" />
			<rect fill="#d96c4a" height="1" width="5" x="1" y="3" />
			<rect fill="#3d1f14" height="1" width="8" x="0" y="4" />
			<rect fill="#8b3a24" height="1" width="8" x="0" y="5" />
		</svg>
	);
}

export function PotionSprite() {
	return (
		<svg
			aria-hidden="true"
			height="14"
			style={{ imageRendering: "pixelated" }}
			viewBox="0 0 7 7"
			width="14"
		>
			<rect fill="#3d1f14" height="1" width="2" x="2" y="0" />
			<rect fill="#8b3a24" height="1" width="3" x="2" y="1" />
			<rect fill="#d96c4a" height="1" width="5" x="1" y="2" />
			<rect fill="#d96c4a" height="2" width="7" x="0" y="3" />
			<rect fill="#8b3a24" height="1" width="7" x="0" y="5" />
			<rect fill="#8b3a24" height="1" width="5" x="1" y="6" />
			<rect fill="#f4a261" height="1" width="1" x="1" y="3" />
		</svg>
	);
}

export function CatSprite() {
	return (
		<svg
			aria-hidden="true"
			height="48"
			style={{ imageRendering: "pixelated" }}
			viewBox="0 0 12 12"
			width="48"
		>
			{/* Ear tips */}
			<rect fill="#2d2424" height="1" width="1" x="1" y="0" />
			<rect fill="#2d2424" height="1" width="1" x="9" y="0" />
			{/* Ears */}
			<rect fill="#2d2424" height="1" width="3" x="0" y="1" />
			<rect fill="#2d2424" height="1" width="3" x="8" y="1" />
			{/* Head rows 2–3 */}
			<rect fill="#2d2424" height="2" width="12" x="0" y="2" />
			{/* Row 4: eyes at x=2 and x=9 */}
			<rect fill="#2d2424" height="1" width="2" x="0" y="4" />
			<rect fill="#2d2424" height="1" width="6" x="3" y="4" />
			<rect fill="#2d2424" height="1" width="2" x="10" y="4" />
			{/* Row 5: whisker highlights at x=3 and x=7 */}
			<rect fill="#2d2424" height="1" width="3" x="0" y="5" />
			<rect fill="#2d2424" height="1" width="3" x="4" y="5" />
			<rect fill="#2d2424" height="1" width="4" x="8" y="5" />
			{/* Head rows 6–7 */}
			<rect fill="#2d2424" height="2" width="12" x="0" y="6" />
			{/* Neck taper */}
			<rect fill="#2d2424" height="1" width="10" x="1" y="8" />
			<rect fill="#2d2424" height="1" width="8" x="2" y="9" />
			<rect fill="#2d2424" height="1" width="6" x="3" y="10" />
			{/* Amber eyes */}
			<rect fill="#f4a261" height="1" width="1" x="2" y="4" />
			<rect fill="#f4a261" height="1" width="1" x="9" y="4" />
			{/* White whisker highlights */}
			<rect fill="#fffaf5" height="1" width="1" x="3" y="5" />
			<rect fill="#fffaf5" height="1" width="1" x="7" y="5" />
		</svg>
	);
}
