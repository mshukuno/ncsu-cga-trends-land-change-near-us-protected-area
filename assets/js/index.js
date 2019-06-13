require([
	'esri/Map',
	'esri/views/MapView',
	'esri/layers/FeatureLayer',
	'esri/geometry/Extent',
	'esri/tasks/QueryTask',
	'esri/tasks/support/Query',
	'esri/geometry/SpatialReference',
	'esri/renderers/ClassBreaksRenderer',
	'esri/renderers/smartMapping/statistics/classBreaks',
	'esri/widgets/Legend',
	'esri/widgets/BasemapGallery',
	'esri/widgets/Expand',
	'esri/widgets/LayerList'
], function(
	Map,
	MapView,
	FeatureLayer,
	Extent,
	QueryTask,
	Query,
	SpatialReference,
	ClassBreaksRenderer,
	classBreaks,
	Legend,
	BasemapGallery,
	Expand
) {
	const VIEW_CENTER_COOR = [-95.84154187664207, 38.004979298982306];
	const INITIAL_ZOOM_LEVEL = 5;
	let statesLyr, padLyr, censusblockLyr, padLayerView, map, view, mainWidth, 
		basemapGallery, bgExpand;

	function init() {
		cache();
		bindEvents();
		createLayers();
		initSettings();
	}

	function initSettings() {
		statesLyr.visible = true;
		censusblockLyr.visible = false;
		padLyr.visible = false;		
		view.popup.close();
		setDefaultSelects();
		setDefaultFdPanel('defaultHousing');
		removeLegend();
		setStateDropdown();
		$colorTab.attr('class', 'nav-link disabled');
		censusblockLyr.opacity = 1;
		gapStatusBackToPlaceholder();
		padBackToPlaceholder();
		$fdPanel.hide();
		setColorSchemeByCategoryNum(5);
	}

	function cache() {
		$ddStates = $('#dd-states');
		$ddGapStatus = $('#dd-gap-status');
		$ddPad = $('#dd-pad');
		$getBlock = $('#btn-getBlock');
		$selectCategory = $('#select-category');
		$fdPanel = $('#fields-design');
		$opacity = $('#opacity-slider');
		$colorTab = $('#color-tab');
		$metricsTab = $('#metrics-tab');
		$numClasses = $('#select-num-class');
		$method = $('#classificationMethod');
		$btnMap = $('#btn-map');
		$gcolor = $('#group-border');
		$dataStorage = $('#data-store');
		$btnStateReset = $('#btn-state-reset');
		$btnGapReset = $('#btn-gap-reset');
	}

	function bindEvents() {
		$ddStates.SumoSelect({
			search: true,
			searchText: 'Search state',
			placeholder: '1. Select state'
		});

		$ddGapStatus.SumoSelect({
			search: true,
			searchText: 'Search protection status',
			placeholder: '2. Select protection status'
		});

		$ddPad.SumoSelect({
			search: true,
			searchText: 'Search protected area',
			placeholder: '3. Select protected area'
		});

		$selectCategory.SumoSelect();
		$numClasses.SumoSelect();
		setNumClassesDropdown(7, config.defaultHousing.numClasses);
		$method.SumoSelect();

		$opacity.ionRangeSlider({
			min: 0,
			max: 1,
			from: 1,
			step: 0.1,
			onFinish: function(data) {
				censusblockLyr.opacity = data.from;
			}
		});

		ionInstance = $opacity.data('ionRangeSlider');

		// Mouse events
		// ----- States ------
		$ddStates.on('change', () => {
			view.popup.close();
			let selected = $ddStates.find(':selected').text();
			let state = selected.split(' (')[0];
			$dataStorage.data({ state: `${state}` });
			censusblockLyr.visible = false;
			console.log($dataStorage.data('state'));
			gapStatusBackToPlaceholder();
			padBackToPlaceholder();
			setDefaultFdPanel('defaultHousing');
			$fdPanel.hide();
			statesLyr.visible = true;
			if (state != null) {
				stateChangeExtent(state);
				queryProtectedArea(state);
			}
		});

		$ddGapStatus.on('change', () => {
			view.popup.close();
			let selected = $ddGapStatus.val();
			let status = selected[selected.length - 1];
			let state = $dataStorage.data('state');
			$dataStorage.data({'status': ''});
			censusblockLyr.visible = false;
			statesLyr.visible = true;
			removeLegend();
			padBackToPlaceholder();
			$selectCategory[0].sumo.selectItem(config.defaultHousing.category);
			$dataStorage.data({'category': config.defaultHousing.category});
			$fdPanel.hide();

			if (status) {
				let expression = `d_State_Nm = '${state}' AND GAP_Sts = '${status}'`;
				$dataStorage.data({ 'gap-status': `${status}` });
				console.log($dataStorage.data('gap-status'));
				let queryGapExtent = queryProtectedAreaExtent(expression);
				
				queryGapExtent.then(result => {
					if (result.count > 0) {
						// Zoom to selected protected area GAP status
						view.goTo(result.extent);
						padLyr.definitionExpression = '1=1';
						padLyr.definitionExpression = expression;
						// Query unit name for dropdown list
						let unitNames = queryUnitNames(expression);
						setProtectedAreaDropdown(unitNames);
					}
					else {
						alert('No result');
						stateChangeExtent(state);
					}
				});
			}
		});

		$ddPad.on('change', () => {
			view.popup.close();
			let selectedOriginId = $ddPad.val();
			let protectedArea = $ddPad.find('option:selected').text();
			console.log(selectedOriginId);
			censusblockLyr.visible = false;
			removeLegend();
			$selectCategory[0].sumo.selectItem(config.defaultHousing.category);
			$dataStorage.data({'category': config.defaultHousing.category});

			if (selectedOriginId != '') {
				let expression = `ORIG_FID = '${selectedOriginId}'`;
				$dataStorage.data({'origin-id': selectedOriginId});
				$dataStorage.data({ 'protected-area': `${protectedArea}` });
				let queryUnitName = queryProtectedAreaExtent(expression);
				queryUnitName.then(result => {
					view.goTo(result.extent);
					padLyr.definitionExpression = '1=1';
					padLyr.definitionExpression = expression;
				});
				statesLyr.visible = false;
				$metricsTab.click();
				$fdPanel.hide();
				getCensusBlock();
			}
		});

		$selectCategory.on('change', () => {
			let category = $selectCategory.find(':selected').text();
			if (category != 'Select category') {
				$dataStorage.data({ category: `${category}` });
				console.log($dataStorage.data('category'));
				if ('#table-data'.length) {
					$('#table-data').remove();
				}
				if (category == config.defaultHousing.category) {
					setDefaultFdPanel('defaultHousing');
				}
				else if (category == config.defaultImpervious.category) {
					setDefaultFdPanel('defaultImpervious');
				}
				tabulate(censusblockinfo[0][category], config.table.columns);
				getCensusBlock();
			}
		});

		// $getBlock.on('click', () => {
		// 	console.log('clicked');
		// 	censusblockLyr.definitionExpression = '1=1';
		// 	let originid = $dataStorage.data('origin-id');
		// 	$selectCategory[0].sumo.selectItem($dataStorage.data('category'));
		// 	$(`#data-fields tr[data-value='${$dataStorage.data('field-name')}']`)
		// 		.addClass('highlight');
		// 	$colorTab.removeClass('disabled');
		// 	bufferFilter(originid).then(result => {
		// 		console.log(result);
		// 		censusBlockFilter(result);
		// 	});
		// 	$fdPanel.show();
		// });

		$numClasses.on('change', () => {
			let classes = Number($numClasses.find(':selected').text());
			$dataStorage.data({ 'num-classes': `${classes}` });
			setColorSchemeByCategoryNum(classes);
		});

		$method.on('change', () => {
			let method = $method
				.find(':selected')
				.text()
				.toLowerCase();
			$dataStorage.data({ method: `${method}` });
		});

		$btnMap.on('click', () => {
			console.log('clicked');
			let colorscheme = [],
				childs = $($dataStorage.data('color-id'));
			console.log('child', childs);
			childs[0].childNodes.forEach(d => {
				if (d.attributes.fill) {
					colorscheme.push(d.attributes.fill.value);
				}
			});
			$dataStorage.data({ 'color-scheme': colorscheme });
			setThematicMapRenderer();
			// BUG: mending -> After clicking Map button deletes 'active' class.
			$($dataStorage.data('color-id')).addClass('active');
		});

		$btnStateReset.on('click', () => {
			// view.center = VIEW_CENTER_COOR;
			// view.zoom = INITIAL_ZOOM_LEVEL;
			view.goTo(statesLyr.fullExtent);
			initSettings();
		});

		$btnGapReset.on('click', () => {
			let state = $dataStorage.data('state');
			gapStatusBackToPlaceholder();
			padBackToPlaceholder();
			$fdPanel.hide();
			censusblockLyr.visible = false;
			statesLyr.visible = true;
			$dataStorage.data({'status': ''});
			$dataStorage.data({'protected-area': ''});
			$dataStorage.data({'pad-info': ''});
			setDefaultFdPanel('defaultHousing');
			$selectCategory[0].sumo.selectItem($dataStorage.data('category'));
			if (state) {
				stateChangeExtent(state);
				queryProtectedArea(state);
			}
		});
	}

	/*========== Feature Filter ========== */
	function bufferFilter(originid) {
		return new Promise((resolve, reject) => {
			let queryTask, query;
			if(originid != ''){
				// originId = originIds[0];
				queryTask = new QueryTask({
					url: config.buffer_10km.url
				});
				query = new Query();
				query.returnGeometry = true;
				query.outFields = ['ORIG_FID'];
				query.where = `ORIG_FID = '${originid}'`;

				queryTask.execute(query).then(result => {
					if(result.features[0].attributes.ORIG_FID){
						// alert(result.features[0]);
						resolve(result.features[0].geometry);
					}
					else{
						reject(Error('There is no buffer feature returned.'));
					}
				});
				
			}
			else{
				reject(Error('No origin id.'));
			}
		});
	}

	function getCensusBlock() {
		view.popup.close();
		censusblockLyr.definitionExpression = '1=1';
		let originid = $dataStorage.data('origin-id');
		$selectCategory[0].sumo.selectItem($dataStorage.data('category'));
		$(`#data-fields tr[data-value='${$dataStorage.data('field-name')}']`)
			.addClass('highlight');
		$colorTab.removeClass('disabled');
		bufferFilter(originid).then(result => {
			console.log(result);
			censusBlockFilter(result);
		});
		$fdPanel.show();
	}

	function censusBlockFilter(bufferGeom) {
		console.log(bufferGeom);
		let query;
		query = censusblockLyr.createQuery();
		query.geometry = bufferGeom;
		query.spatialRelationship = 'intersects';
		query.returnGeometry = true;
		query.outField = ['*'];
		query.outSpatialReference = new SpatialReference(102100);

		censusblockLyr.queryFeatures(query).then(results => {
			if(results.features.length > 0){
				console.log('intersects', results);

				getCensusBlockIds(results)
					.then(objectsIds => {
						return setDefinitionExpression(objectsIds, 'OBJECTID', 'OR');
					}).then(expression => {
						// alert(expression);
						censusblockLyr.definitionExpression = expression;
					}).then(() => {
						censusblockLyr.queryExtent(query).then(result => {
							view.goTo(result.extent);
						});
						setThematicMapRenderer();
					});
			}
			// else{
			// 	// alert('No intersects found.');
			// }
		});
	}

	/*========== Utils ========== */
	// Getters
	function getCensusBlockIds(data) {
		return new Promise((resolve, reject) => {
			if(data.features.length > 0){
				let result = $.map(data.features, d => {
					return d.attributes.OBJECTID;
				});
				console.log('Ids', result);
				resolve(result);
			}
			else{
				// alert('No features');
				reject(new Error('No features.'));
			}
		});
	}

	function gapStatusBackToPlaceholder() {
		$('#dd-gap-status option[value=""]').removeAttr('disabled');
		$ddGapStatus[0].sumo.selectItem(0);
		$('#dd-gap-status option[value=""]').attr('disabled', 'disabled');
	}

	function padBackToPlaceholder() {
		$ddPad.html('');
		$ddPad[0].sumo.reload();
	}

	// Setters
	function setDefaultSelects() {
		$dataStorage.data({'state': ''});
		$dataStorage.data({'status': ''});
		$dataStorage.data({'protected-area': ''});
		$dataStorage.data({'pad-info': ''});
	}

	function setDefaultFdPanel(category) {
		$dataStorage.data({'category': config[category].category });
		$dataStorage.data({'field-name': config[category].fieldName });
		$dataStorage.data({'data-type': config[category].dataType });
		$dataStorage.data({'num-classes': config[category].numClasses });
		$dataStorage.data({'method': config[category].method });
		$dataStorage.data({'color-scheme': config[category].colorScheme });
		$dataStorage.data({'color-id': config[category].colorId });
		defaultOpacity();
		setNumClassesDropdown(7, config[category].numClasses);
		setColorSchemeByCategoryNum(config[category].numClasses);
		$method[0].sumo.selectItem(config[category].method);
	}

	function setStateDropdown() {
		$ddStates.html('');
		$ddStates[0].sumo.reload();
		hpdata.forEach(d => {
			$ddStates[0].sumo.add(`${d.State}`);
		});
	}

	function compareValues(key, order='asc') {
		//https://www.sitepoint.com/sort-an-array-of-objects-in-javascript/
		return function(a, b) {
			if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
				return 0; 
			}
			
			const varA = (typeof a[key] === 'string') ? 
				a[key].toUpperCase() : a[key];
			const varB = (typeof b[key] === 'string') ? 
				b[key].toUpperCase() : b[key];
				
			let comparison = 0;
			if (varA > varB) {
				comparison = 1;
			} else if (varA < varB) {
				comparison = -1;
			}
			return (
				(order == 'desc') ? (comparison * -1) : comparison
			);
		};
	}

	function setProtectedAreaDropdown(unitNames) {
		padBackToPlaceholder();
		$ddPad[0].sumo.add('Loading...');
		unitNames.then(results => {
			return results.features.map(d => {
				return {
					'originId': d.attributes.ORIG_FID, 
					'unitName': d.attributes.Unit_Nm,
					'agency': d.attributes.d_Mang_Nam,
					'destType': d.attributes.d_Des_Tp
				}
			});
		}).then(attrs => {
			return attrs.sort(compareValues('unitName'));
		}).then(sorted => {
			$dataStorage.data({'pad-info': sorted});
			padBackToPlaceholder()
			sorted.forEach(d => {
				$ddPad[0].sumo.add(d.originId, d.unitName);
			});
		});
	}


	function setNumClassesDropdown(numclasses, selectItem) {
		$numClasses.html('');
		$numClasses[0].sumo.reload();
		for (let i = 1; i <= numclasses; i++) {
			let num = i.toString();
			$numClasses[0].sumo.add(num);
		}
		$numClasses[0].sumo.selectItem(`${selectItem}`);
	}

	function setDefinitionExpression(data, fieldName, operator) { 
		return new Promise((resolve, reject) => {
			if(data.length > 0){
				let expression = '';
				data.forEach((val, i) => {
					if (i == data.length - 1) {
						expression = expression + `${fieldName} = ${val}`;
					} else {
						expression = expression + `${fieldName} = ${val} ${operator} `;
					}
				});
				resolve(expression);
			}
			else{
				reject(Error('No Ids'));
			}
		});
	}

	function hideFieldDesign(){
		$metricsTab.click();
		$('.nav-tabs a[href="#fields"]').tab('show');
		$colorTab.attr('class', 'nav-link disabled');
		$fdPanel.hide();
		$method[0].sumo.selectItem(config.defaultHousing.method);
		$selectCategory[0].sumo.selectItem(config.defaultHousing.category);
		defaultOpacity();
		setNumClassesDropdown(7, config.defaultHousing.numClasses);
		setColorSchemeByCategoryNum(config.defaultHousing.numClasses);
	}

	function defaultOpacity() {
		ionInstance.update({from: 1});
		censusblockLyr.opacity = 1;
	}

	function setThematicMapRenderer() {
		console.log($dataStorage.data('protected-area'));
		let classbreakinfo = [];
		let renderer;
		let popupTitle = `<b>Census Block: ${$dataStorage.data('protected-area')}, ${$dataStorage.data('state')}</b>`;
		let popupTemplate = {
			title: popupTitle,
			content: `<b>${$dataStorage.data('field-name')}:</b> {${$dataStorage.data('field-name')}:NumberFormat}`
		};
		censusblockLyr.popupTemplate = popupTemplate;
		console.log('field-name', $dataStorage.data('field-name'));
		classBreaks({
			layer: censusblockLyr,
			field: $dataStorage.data('field-name'),
			classificationMethod: $dataStorage.data('method'),
			numClasses: $dataStorage.data('num-classes'),
		}).then(response => {
			console.log('response', response);
			let numBreaks = response.classBreakInfos.length;

			if (numBreaks < $dataStorage.data('num-classes')) {
				setNumClassesDropdown(numBreaks, numBreaks);
				$dataStorage.data({ 'num-classes': numBreaks });
			}
			// BUG? added this for selectItem 1 since 'else' statement doen't work for value 1
			else if ($dataStorage.data('num-classes') == 1) {
				$numClasses[0].sumo.selectItem('1');
			} else {
				setNumClassesDropdown(7, numBreaks);
			}

			response.classBreakInfos.forEach((d, i) => {
				let symbol = {
					type: 'simple-fill',
					color: $dataStorage.data('color-scheme')[i],
					style: 'solid',
					outline: {
						width: 0.5,
						color: 'white',
					},
				};

				classbreakinfo.push({
					maxValue: d.maxValue,
					minValue: d.minValue,
					symbol: symbol,
					label: d.label,
				});
			});
			console.log(classbreakinfo);
			renderer = new ClassBreaksRenderer({
				field: $dataStorage.data('field-name'),
				classBreakInfos: classbreakinfo,
			});

			censusblockLyr.renderer = renderer;
			censusblockLyr.visible = true;
			createLegend();
		});
	}

	// Events
	/*========== Extent ========== */
	function stateChangeExtent(state) {
		let extent = getStateMapExtent(state);
		goToExtent(extent);
	}

	function goToExtent(extent) {
		view.goTo(extent).then( () => {
			if (!view.extent.contains(extent)) {
				view.zoom -= 1;
			}
		});
	}

	function getStateMapExtent(state) {
		let stateExtent = null;
		hpdata.forEach(d => {
			if (d.State == state) {
				let se = d.Extent;
				stateExtent = new Extent({
					xmin: se[0],
					ymin: se[1],
					xmax: se[2],
					ymax: se[3],
					spatialReference: { wkid: 102100 },
				});
			}
		});
		return stateExtent;
	}

	/*========== Query ========== */
	// Query: Protected Area by State
	function queryProtectedArea(state) {
		let expression = `d_State_Nm = '${state}'`;
		padLyr.definitionExpression = expression;
		padLyr.visible = true;
	}

	// Query: Get Unit_Nm by state and GAP status
	function queryUnitNames(expression) {
		queryTask = new QueryTask({
			url: config.conus_pad.url,
		});
		query = new Query();
		query.returnGeometry = true;
		query.outFields = ['*'];
		query.where = expression;

		return queryTask.execute(query).then(results => {
			//console.log(results.features);
			$dataStorage.data({ 'PAD': results.features });
			//console.log('.data()', $('#store').data('PAD'));
			return results;
		});
	}

	// Query: Zoom to selected protected area
	function queryProtectedAreaExtent(expression) {
		query = new Query();
		query.returnGeometry = true;
		query.outFields = ['*'];
		query.where = expression;
		query.outSpatialReference = new SpatialReference(102100);
		return padLyr.queryExtent(query).then(result => {
			return result
		}); 
	}

	/*========== Field table ========== */
	function tabulate(data, columns) {
		removeTable();
		//let ch = $('#content-container').height();
		let table = d3
			.select('#data-fields')
			.append('table')
			.attr('class', 'table table-hover table-bordered')
			.attr('id', 'table-data');

		let thead = table.append('thead'),
			tbody = table.append('tbody'),
			rows;
		// append the header row
		thead
			.append('tr')
			.selectAll('th')
			.data(() => {
				return columns.map(item => {
					return item.name;
				});
			})
			.enter()
			.append('th')
			.text(function(column) {
				return column;
			});

		// create a row for each object in the data
		rows = tbody
			.selectAll('tr')
			.data(data)
			.enter()
			.append('tr')
			.attr('data-value', d => {
				return d.fieldName;
			})
			.on('click', function mouseOver(d) {
				let selected = $(this).hasClass('highlight');
				$('#table-data tr').removeClass('highlight');
				if (!selected) {
					$(this).addClass('highlight');
				}
				$dataStorage.data({ 'field-name': d.fieldName });
				$dataStorage.data({ 'data-type': d.dataType });
				// Census Block Thematic Map (Field parameter setup)
				setThematicMapRenderer();
				// Color Tab control
				//onOffColorTab(d.dataType, d.fieldName);
			});
		// create a cell in each row for each column
		rows
			.selectAll('td')
			.data(function(row) {
				return columns.map(function(column) {
					return {
						[column.data]: column.data,
						value: row[column.data],
					};
				});
			})
			.enter()
			.append('td')
			.text(function(d) {
				return d.value;
			});

		return table;
	}

	/*========== Legend ========== */
	function createLegend() {
		removeLegend();
		let legend = new Legend({
			id: 'legendWrapper',
			view: view,
			layerInfos: [
				{
					layer: censusblockLyr,
					title: 'Census Block Group:',
				},
			],
		});
		view.ui.add(legend, 'bottom-left');

		interact(legend.container).draggable({
			restrict: {
				restriction: view.container,
				endOnly: true,
				elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
			},
			// enable autoScroll
			autoScroll: true,
			// call this function on every dragmove event
			onmove: dragMoveListener,
		});
	}

	function dragMoveListener(evt) {
		var target = evt.target,
			// keep the dragged position in the data-x/data-y attributes
			x = (parseFloat(target.getAttribute('data-x')) || 0) + evt.dx,
			y = (parseFloat(target.getAttribute('data-y')) || 0) + evt.dy;

		// translate the element
		target.style.webkitTransform = target.style.transform =
			'translate(' + x + 'px, ' + y + 'px)';

		// update the posiion attributes
		target.setAttribute('data-x', x);
		target.setAttribute('data-y', y);
	}

	function removeLegend() {
		view.ui.empty('bottom-left');
	}

	function removeTable() {
		if ($('#data-fields table').length) {
			$('#data-fields table').remove();
		}
	}

	function createLayers() {
		
		/*========== States Layer========== */
		statesLyr = new FeatureLayer(config.states.url, {
			title: config.states.title,
			outFields: config.states.outfields,
			visible: true,
			opacity: 1,
		});
		// Symbol
		statesLyr.renderer = {
			type: 'simple',
			symbol: {
				type: 'simple-fill',
				color: config.states.symbol.fill_color,
				outline: {
					color: config.states.symbol.line_color,
					width: config.states.symbol.line_width,
				},
			},
		};
		// Label
		statesLyr.labelingInfo = [
			{
				symbol: {
					type: 'text',
					color: config.states.label.text_color,
					font: {
						family: config.states.label.font_family,
						size: config.states.label.font_size,
						weight: 'bold',
					},
				},
				labelExpressionInfo: {
					expression: `$feature.${config.states.label.label_field}`,
				},
			},
		];

		/*========== Protected Area Layer ========== */
		padLyr = new FeatureLayer({
			url: config.conus_pad.url,
			definitionExpression: 'ORIG_FID <= 1681',
			title: config.conus_pad.title,
			outFields: config.conus_pad.outfields,
			visible: false,
			popupTemplate: {
				title: '<b>Protected Area</b><br>',
				content: `<b>Name: </b> {Unit_Nm}<br>
				<b>Federal Management Agency: </b>{d_Mang_Nam}<br>
				<b>Designation Type: </b>{d_Des_Tp}<br>`,
			},
		});

		/*========== Census Block Layer ========== */
		censusblockLyr = new FeatureLayer({
			url: config.census_block.url,
			title: config.census_block.title,
			outFields: config.census_block.outfields,
			visible: false,
			opacity: 1,
			listMode: 'hide',
		});

		map = new Map({
			basemap: 'streets',
		});

		view = new MapView({
			container: 'viewDiv',
			map: map,
			center:  VIEW_CENTER_COOR, 
			zoom: INITIAL_ZOOM_LEVEL,
			padding: {
				right: mainWidth,
			},
		});

		basemapGallery = new BasemapGallery({
			view: view,
			container: document.createElement('div')
		});

		bgExpand = new Expand({
			view: view,
			content: basemapGallery
		});

		view.ui.add(bgExpand, {
			position: 'top-left'
		});

		map.addMany([statesLyr, censusblockLyr, padLyr]);

		view.when(() => {
			view.goTo(statesLyr.fullExtent);
		});
	}

	/*========== Side menue ========== */
	$('#main').BootSideMenu({
		side: 'right',
		width: '28%',
		autoClose: false,
		closeOnClick: false,
		pushBody: true,
		duration: '500',
		icons: {
			left: 'fas fa-angle-double-left',
			right: 'fas fa-angle-double-right',
			down: 'fas fa-angle-double-right',
		},
	});
	mainWidth = $('#main').width() - 50;

	$(document).ready(function() {
		init();
	});
	// window.onload = function(){
	// 	setInterval(() => {
	// 		alert('Hello');
	// 	}, 7000);
	// };

});
