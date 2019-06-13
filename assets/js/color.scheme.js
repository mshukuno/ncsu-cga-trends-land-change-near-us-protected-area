/*========== Color scheme ========== */
function setColorSchemeByCategoryNum(catNum) {
	$('#colorScheme').empty();
	let d3brewer = d3.entries(colorbrewer);
	let colors = d3brewer.map(d => {
		if (catNum === 1) {
			return { key: d.key, value: [d.value[3][2]] };
		}
		else if (catNum === 2) {
			return { key: d.key, value: [d.value[3][0], d.value[3][2]] }
		}
		else if (d.value[catNum]) {
			return { key: d.key, value: d.value[catNum] };
		}
	}),

	svgHeight = 30 * colors.length + 30,
	colorScaleWidth = 200,
	colorScaleHeight = '20px';

	let svg = d3.select('#colorScheme')
		.append('svg')
		.attr('id', 'svgColor')
		.attr('height', svgHeight)
		.attr('width', colorScaleWidth)

	for (let c = 0; c < colors.length; c++) {
		let one = svg.append('g')
			.attr('id', colors[c].key)
			.attr('class', 'inactive')
			.attr('transform', () => {
				let row = (c + 1) * 30;
				return `translate(0, ${row})`;
			})
		for (let p = 0; p < colors[c].value.length; p++) {
			one.append('rect')
				.attr('x', () => {
					return p * (colorScaleWidth / catNum);
				})
				// .attr('y', 0)
				.attr('width', () => {
					let width = colorScaleWidth / catNum
					return `${width}px`
				})
				.attr('height', colorScaleHeight)
				.attr('fill', () => {
					return colors[c].value[p];
				});
		}

		// Set default color selection
		$($dataStorage.data('color-id')).attr('class', 'active');

		one.append('rect')
			.attr('class', 'outer')
			.attr('width', colorScaleWidth)
			.attr('height', '20px')
			.attr('cursor', 'pointer')
			.on('click', () => {
				let e = d3.event,
				id = `#${e.target.parentNode.id}`;

				$(id).removeClass('inactive');

				$dataStorage.data({'color-id': `#${e.target.parentNode.id}`});
				if (!e.ctrlKey) {
					d3.selectAll('g.active').classed('inactive', true);
					d3.selectAll('g.active').classed('active', false);
				}

				$(id).addClass('active');

			})
		one.append('title')
			.text(colors[c].key)
	}
}


