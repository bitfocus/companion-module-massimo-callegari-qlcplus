const { combineRgb } = require('@companion-module/base')

// Store feedback colors in one place to be retrieved later for dynamic preset creation
const feedbacksSettings = {
	colors: {
		task: {
			play: {
				fg: 0x000000,
				bg: combineRgb(0, 204, 0),
			},
			pause: {
				fg: 0x000000,
				bg: 0xffff00,
			},
			stop: {
				fg: 0x000000,
				bg: 0xff0000,
			},
		},
	},
	// Icons for feedbacks
	images: {
		play: 'iVBORw0KGgoAAAANSUhEUgAAABEAAAASCAYAAAC9+TVUAAAA70lEQVQ4ja3Sr0pEQRSA8d+KoE0xWwxrMZnV5gtYBNknMIlBUEEQg6gYtFiMmgym3WbyT1MEZQWDwVdYEJPsMjAXLsvuOvfqB6ecw/nmzMyp2LWMFcxgHQ0FGcJsjCrquMZ0EU2Q/MTIWMIL9jCWKqnEyDOCHTyjVlaSMYVL3GJukCSFBdzhDJNlJeK0q3jFBkZTr9OLcRzhEYuYGC7Q3E3Yq2Nc/EXyji08lZG0cIhTfIVEEUkb59jHZ76QKnnAJu57FX/74o+4sfP9BPlJ2l35bxzgJL7BQIIki4wrbMcpkgjNTbzFE9dwk9r8f6ADuKMokqIGAikAAAAASUVORK5CYII=',
		pause:
			'iVBORw0KGgoAAAANSUhEUgAAABEAAAASCAYAAAC9+TVUAAAAgElEQVQ4je3TMQrCQBSE4Q8R1EqwtLD1fLlVjmKXUuzEwk7BSq1GVjYgqdOZgYF9u8Pwv2KNpkSbOCSOiS5xSzTJ9613U++7miv5tjDMK8i+evUDth1AlnlTXfTEohxmY2wzlUwlf1jSf8AT3ljjhR2ug2yZ77hgiQfOY0CMJHwAeEQxBHfIt9gAAAAASUVORK5CYII=',
		stop: 'iVBORw0KGgoAAAANSUhEUgAAABEAAAASCAYAAAC9+TVUAAAAr0lEQVQ4jd2UTQrCQAyFvwwFoQs9mguP5w0EwavpougqEu3IMD+ZoUsflEeTTPPmJVQUzsAJeALCFxa3F6VEGpuBqxXfgf16iJx7UHgEYKm1i1CH19wSYrE0eAASeh17OWs2kd19i6JJk7qasZ5fPyV5py1KPp6M3L/G8Rn2xFNYTCfHyA4Ve5LD8yTm/kuJ2kcO3ohb8YRnG/FF4KjwslhrySojtt/ITuDmiB0E8AaNyz9eqBbaeQAAAABJRU5ErkJggg==',
	},
}

module.exports = { feedbacksSettings }
