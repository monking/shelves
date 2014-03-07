$.fn.shelves = function(options) {
	options = $.extend({
		itemSelector: "> *",
		averageHeight: 200,
		heightVariance: 80,
		resizeInterval: 100,
		gutter: 10,
		minAspect: 1,
		maxAspect: 2,
		tempoOptions: {},
		tempoHandler: function(controller, options) {
			this.add = function(item) {
				item.css({visibility: "visible"}).addClass("shelved-visible");
				controller.updateContainer();
			}
			this.reset = function() {}
		}
	}, options);

	$(this).each(function() {
		var container, layoutController;
		container = $(this);
		layoutController = container.data(SHELVES.CONTROLLER_DATA_NAME);
		if (typeof layoutController === "undefined") {
			layoutController = {
				container: $(this),
				init:function() {
					var I = this;
					this.container.data(SHELVES.CONTROLLER_DATA_NAME, this);
					if (typeof options.tempoHandler === "function") {
						this.tempoHandler = new options.tempoHandler(this, options.tempoOptions);
					}
					this.refresh();
					this.resizeTimeout = null;
					$(window).resize(function() {
						clearTimeout(I.resizeTimeout);
						I.resizeTimeout = setTimeout(function() {
							I.layout();
							I.updateContainer();
						}, options.resizeInterval);
					});
				},
				refresh:function() {
					this.updateItems();
					if (!this.items.filter(".shelved").length) {
						this.tempoHandler.reset();
					}
					this.layout();
				},
				updateItems:function() {
					this.items = this.container.find(options.itemSelector);
				},
				startRow:function() {
					var top;
					if (typeof this.rows === "undefined") {
						this.rows = [];
						top = parseInt(this.container.css("padding-top"));
					} else {
						top = this.rows[this.rowIndex].top + this.rows[this.rowIndex].height + options.gutter;
					}
					this.rows.push({
						top: top,
						height: this.minRowHeight,
						bareWidth: 0,
						bareAspect: 0,
						start: this.itemIndex,
						items: [],
						complete: false
					});
					this.rowIndex = this.rows.length - 1;
				},
				endRow:function() {
					var row, sumWidth, i, len, item, itemProps, newItemWidth, left;
					row = this.rows[this.rowIndex];
					row.bareAspect = row.bareWidth / row.height;
					len = row.items.length;
					row.height = (this.containerWidth - options.gutter * (len - 1)) / row.bareAspect;
					if (row.height > this.maxRowHeight) row.height = options.averageHeight;
					left = this.containerPaddingLeft;
					for (i = 0; i < len; i++) {
						item = row.items[i];
						itemProps = item.data(SHELVES.ELEMENT_DATA_NAME);
						newItemWidth = row.height * itemProps.aspect;
						item.css({
							height: Math.round(row.height) + "px",
							width: Math.round(newItemWidth) + "px",
							position: "absolute",
							top: row.top + "px",
							left: Math.round(left) + "px"
						});
						if (!item.is(".shelved")) {
							item.addClass("shelved");
							this.tempoHandler.add(item);
						}
						left += newItemWidth + options.gutter;
					}
					row.complete = true;
				},
				walkItems:function() {
					var I, item, aspectObject, itemProps, itemOrigDims, newItemWidth;
					if (!this.walking) return;
					I = this;
					item = this.items.eq(this.itemIndex);
					if (typeof this.rows === "undefined") this.startRow();
					itemProps = item.data(SHELVES.ELEMENT_DATA_NAME);
					if (typeof itemProps === "undefined") {
						itemOrigDims = item.data("origDims");
						if (typeof itemOrigDims !== "undefined" && itemOrigDims.width && itemOrigDims.height) {
							itemProps = {
								origWidth: itemOrigDims.width,
								origHeight: itemOrigDims.height
							};
						} else {
							aspectObject = item.find("> img");
							if (aspectObject.length) {
								itemProps = {
									origWidth: aspectObject.width(),
									origHeight: aspectObject.height()
								};
								if (!itemProps.origWidth || !itemProps.origHeight) {
									this.walking = false;
									aspectObject.load(function() {
										I.walking = true;
										I.walkItems();
									});
									return;
								}
							} else {
								itemProps = {
									origWidth: item.width(),
									origHeight: item.height()
								};
							}
						}
						// FIXME: suppose square format for items without width or height
						if (!itemProps.origWidth) {
							itemProps.origWidth = itemProps.origHeight;
						} else if (!itemProps.origHeight) {
							itemProps.origHeight = itemProps.origWidth;
						}
						itemProps.aspect = itemProps.origWidth / itemProps.origHeight;
						itemProps.aspect = Math.min(options.maxAspect, Math.max(options.minAspect, itemProps.aspect));
						item.data(SHELVES.ELEMENT_DATA_NAME, itemProps);
					}
					newItemWidth = this.rows[this.rowIndex].height * itemProps.aspect;
					if (newItemWidth + options.gutter * this.rows[this.rowIndex].items.length + this.rows[this.rowIndex].bareWidth > this.containerWidth) {
						this.endRow();
						this.startRow();
					}
					this.rows[this.rowIndex].items.push(item);
					this.rows[this.rowIndex].bareWidth += newItemWidth;
					this.itemIndex++;
					if (this.itemIndex >= this.items.length) {
						if (!this.rows[this.rowIndex].complete) {
							this.endRow();
						}
						// clearInterval(this.walkingInterval);
					} else {
						this.walkItems();
					}
				},
				layout:function() {
					var I = this;
					if (!this.items.length) return;
					this.containerPaddingTop = parseInt(this.container.css("padding-top"));
					this.containerPaddingLeft = parseInt(this.container.css("padding-left"));
					this.containerWidth = this.container.width();
					console.log(this.containerWidth);
					this.minRowHeight = options.averageHeight - options.heightVariance / 2;
					this.maxRowHeight = this.minRowHeight + options.heightVariance;
					this.revealStep = 0;
					this.itemIndex = 0;
					if (typeof this.rows !== "undefined") delete this.rows;
					this.items.not(".shelved").css({visibility:"hidden"});
					this.walking = true;
					I.walkItems();
					/*
					this.walkingInterval = setInterval(function() {
						I.walkItems();
					}, 0);
					*/
				},
				updateContainer:function(){
					var lastVisibleItem;
					lastVisibleItem = this.items.filter(".shelved-visible").last();
					this.container.css({
						height: (lastVisibleItem.length ? lastVisibleItem.position().top + lastVisibleItem.height() : 0) + "px" });
				}
			};
			layoutController.init();
		} else {
			layoutController.refresh();
		}
		/*DEBUG*/window.shelvesController = layoutController;
	});
  return this;
};
var SHELVES = {
	CONTROLLER_DATA_NAME: 'shelvesController',
	ELEMENT_DATA_NAME: 'shelvesProperties'
};
