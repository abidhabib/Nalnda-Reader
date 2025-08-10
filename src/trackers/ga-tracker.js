import ReactGA from "react-ga4"

ReactGA.initialize([
	{trackingId: "G-FN5P6VVSBZ"}
])

const GaTracker = action => {
	ReactGA.event({
		category: "macro",
		action: action,
		label: action,
		nonInteraction: false
	});
}

export default GaTracker