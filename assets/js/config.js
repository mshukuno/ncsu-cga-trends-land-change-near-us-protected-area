const config = {
	states: {
		url:
			'https://services1.arcgis.com/aT1T0pU1ZdpuDk1t/arcgis/rest/services/Cont_US_Boundary/FeatureServer/0',
		title: 'States',
		layerid: 'StatesLyr',
		symbolflag: 'true',
		labelflag: 'true',
		outfields: ['NAME'],
		symbol: {
			line_color: [255, 255, 255],
			line_width: 0.5,
			fill_color: [0, 0, 0]
		},
		label: {
			font_size: '11pt',
			font_family: 'arial',
			text_color: '#fff',
			label_field: 'NAME'
		},
		symbol_hightlight: {
			line_color: [255, 0, 0],
			line_width: 2,
			fill_color: [125, 125, 125, 0.35]
		},
		symbol_select: {
			line_color: [255, 255, 255],
			line_width: 1
		},
	},
	census_block: {
		url:
			'https://services1.arcgis.com/aT1T0pU1ZdpuDk1t/arcgis/rest/services/Cont_US_Block_Groups_10_00_90/FeatureServer/0',
		title: 'Census Block',
		layerid: 'CensusBlockLyr',
		symbolflag: 'false',
		labelflag: 'false',
		outfields: [
			'GEOID10',
			'STATE',
			'COUNTY',
			'HU1990',
			'HU2000',
			'HU2010',
			'HD1990',
			'HD2000',
			'HD2010',
			'IMPHA00',
			'PCTIMP00',
			'IMPHA10',
			'PCTIMP10',
			'HDCHG9010',
			'IMPCHG0010',
			'HDCHG0010'
		],
	},
	conus_pad: {
		url:
			'https://services1.arcgis.com/aT1T0pU1ZdpuDk1t/arcgis/rest/services/FEDconus_DesProtectedAreas/FeatureServer/0',
		title: 'CONUS Federal Protected Area',
		outfields: ['*'],
		label: {
			font_size: '11pt',
			font_family: 'arial',
			text_color: '#fff',
			label_field: 'NAME'
		},
		symbol_hightlight: {
			line_color: [255, 0, 0],
			line_width: 2,
			fill_color: [125, 125, 125, 0.35]
		},
		symbol_select: {
			line_color: [255, 255, 255],
			line_width: 1
		},
	},
	buffer_10km: {
		url:
			'https://services1.arcgis.com/aT1T0pU1ZdpuDk1t/arcgis/rest/services/buffer_10km/FeatureServer/0',
		title: '10km Buffer',
		layerid: 'buffer_10km',
		symbolflag: 'false',
		labelflag: 'false'
	},
	table: {
		columns: [
			{ name: 'Field', data: 'fieldName' },
			{ name: 'Description', data: 'description' }
		],
	},
	defaultHousing: {
		category: 'Housing Density',
		fieldName: 'HD2010',
		dataType: 'Float',
		numClasses: 5,
		method: 'natural-breaks',
		colorScheme: ['#f0f9e8', '#bae4bc', '#7bccc4', '#43a2ca', '#0868ac'],
		colorId: '#GnBu'
	},
	defaultImpervious: {
		category: 'Impervious Surface',
		fieldName: 'PCTIMP10',
		dataType: 'Float',
		numClasses: 5,
		method: 'natural-breaks',
		colorScheme: ['#f0f9e8', '#bae4bc', '#7bccc4', '#43a2ca', '#0868ac'],
		colorId: '#GnBu'
	},
};
