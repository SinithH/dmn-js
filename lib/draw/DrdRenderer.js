'use strict';

var inherits = require('inherits'),
    isArray = require('lodash/lang/isArray'),
    isObject = require('lodash/lang/isObject'),
    assign = require('lodash/object/assign');

var BaseRenderer = require('diagram-js/lib/draw/BaseRenderer'),
    RenderUtil = require('diagram-js/lib/util/RenderUtil'),
    TextUtil = require('diagram-js/lib/util/Text'),
    ModelUtil = require('../util/ModelUtil');

var is = ModelUtil.is,
    getName = ModelUtil.getName;

var createLine = RenderUtil.createLine;

function DrdRenderer(eventBus, pathMap, styles) {

  BaseRenderer.call(this, eventBus);

  var LABEL_STYLE = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px'
  };

  var textUtil = new TextUtil({
    style: LABEL_STYLE,
    size: { width: 100 }
  });

  var markers = {};

  function addMarker(id, element) {
    markers[id] = element;
  }

  function marker(id) {
    return markers[id];
  }

  function initMarkers(svg) {

    function createMarker(id, options) {
      var attrs = assign({
        strokeWidth: 1,
        strokeLinecap: 'round',
        strokeDasharray: 'none'
      }, options.attrs);

      var ref = options.ref || { x: 0, y: 0 };

      var scale = options.scale || 1;

      // fix for safari / chrome / firefox bug not correctly
      // resetting stroke dash array
      if (attrs.strokeDasharray === 'none') {
        attrs.strokeDasharray = [10000, 1];
      }

      var marker = options.element
                     .attr(attrs)
                     .marker(0, 0, 20, 20, ref.x, ref.y)
                     .attr({
                       markerWidth: 20 * scale,
                       markerHeight: 20 * scale
                     });

      return addMarker(id, marker);
    }

    createMarker('association-start', {
      element: svg.path('M 11 5 L 1 10 L 11 15'),
      attrs: {
        fill: 'none',
        stroke: 'black',
        strokeWidth: 1.5
      },
      ref: { x: 1, y: 10 },
      scale: 0.5
    });

    createMarker('association-end', {
      element: svg.path('M 1 5 L 11 10 L 1 15'),
      attrs: {
        fill: 'none',
        stroke: 'black',
        strokeWidth: 1.5
      },
      ref: { x: 12, y: 10 },
      scale: 0.5
    });

    createMarker('information-requirement-end', {
      element: svg.path('M 1 5 L 11 10 L 1 15 Z'),
      ref: { x: 11, y: 10 },
      scale: 1
    });

    createMarker('knowledge-requirement-end', {
      element: svg.path('M 1 3 L 11 10 L 1 17').attr({
        fill: 'none',
        stroke: 'black',
        strokeWidth: 2
      }),
      ref: { x: 11, y: 10 },
      scale: 0.8
    });

    createMarker('authority-requirement-end', {
      element: svg.circle(3, 3, 3),
      ref: { x: 3, y: 3 },
      scale: 0.9
    });
  }

  function computeStyle(custom, traits, defaultStyles) {
    if (!isArray(traits)) {
      defaultStyles = traits;
      traits = [];
    }

    return styles.style(traits || [], assign(defaultStyles, custom || {}));
  }


  function drawRect(p, width, height, r, offset, attrs) {

    if (isObject(offset)) {
      attrs = offset;
      offset = 0;
    }

    offset = offset || 0;

    attrs = computeStyle(attrs, {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'white'
    });

    return p.rect(offset, offset, width - offset * 2, height - offset * 2, r).attr(attrs);
  }

  function renderLabel(p, label, options) {
    return textUtil.createText(p, label || '', options).addClass('djs-label');
  }

  function renderEmbeddedLabel(p, element, align) {
    var name = getName(element);
    return renderLabel(p, name, { box: element, align: align, padding: 5 });
  }

  function drawPath(p, d, attrs) {

    attrs = computeStyle(attrs, [ 'no-fill' ], {
      strokeWidth: 2,
      stroke: 'black'
    });

    return p.path(d).attr(attrs);
  }


  var handlers = {
    'dmn:Decision': function(p, element, attrs) {
      var rect = drawRect(p, element.width, element.height, 0, attrs);

      renderEmbeddedLabel(p, element, 'center-middle');

      return rect;
    },
    'dmn:KnowledgeSource': function(p, element, attrs) {

      var pathData = pathMap.getScaledPath('KNOWLEDGE_SOURCE', {
        xScaleFactor: 1.021,
        yScaleFactor: 1,
        containerWidth: element.width,
        containerHeight: element.height,
        position: {
          mx: 0.0,
          my: 0.075
        }
      });

      var knowledgeSource = drawPath(p, pathData, {
        strokeWidth: 2,
        fill: 'white',
        stroke: 'black'
      });

      renderEmbeddedLabel(p, element, 'center-middle');

      return knowledgeSource;
    },
    'dmn:BusinessKnowledgeModel': function(p, element, attrs) {

      var pathData = pathMap.getScaledPath('BUSINESS_KNOWLEDGE_MODEL', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: element.width,
        containerHeight: element.height,
        position: {
          mx: 0.0,
          my: 0.3
        }
      });

      var businessKnowledge = drawPath(p, pathData, {
        strokeWidth: 2,
        fill: 'white',
        stroke: 'black'
      });

      renderEmbeddedLabel(p, element, 'center-middle');

      return businessKnowledge;
    },
    'dmn:InputData': function(p, element, attrs) {

      var rect = drawRect(p, element.width, element.height, 22, attrs);

      renderEmbeddedLabel(p, element, 'center-middle');

      return rect;
    },
    'dmn:TextAnnotation': function(p, element, attrs) {
      var style = {
        'fill': 'none',
        'stroke': 'none'
      };
      var textElement = drawRect(p, element.width, element.height, 0, 0, style),
          textPathData = pathMap.getScaledPath('TEXT_ANNOTATION', {
            xScaleFactor: 1,
            yScaleFactor: 1,
            containerWidth: element.width,
            containerHeight: element.height,
            position: {
              mx: 0.0,
              my: 0.0
            }
          });

      drawPath(p, textPathData);

      var text = getSemantic(element).text || '';

      renderLabel(p, text, { box: element, align: 'left-middle', padding: 5 });

      return textElement;
    },
    'dmn:Association': function(p, element, attrs) {
      var semantic = getSemantic(element);

      attrs = assign({
        strokeDasharray: '0.5, 5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none'
      }, attrs || {});

      if (semantic.associationDirection === 'One' ||
          semantic.associationDirection === 'Both') {
        attrs.markerEnd = marker('association-end');
      }

      if (semantic.associationDirection === 'Both') {
        attrs.markerStart = marker('association-start');
      }

      return drawLine(p, element.waypoints, attrs);
    },
    'dmn:InformationRequirement': function(p, element, attrs) {

      attrs = assign({
        strokeWidth: 1,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        markerEnd: marker('information-requirement-end')
      }, attrs || {});

      return drawLine(p, element.waypoints, attrs);
    },
    'dmn:KnowledgeRequirement': function(p, element, attrs) {

      attrs = assign({
        strokeWidth: 1,
        strokeDasharray: 5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        markerEnd: marker('knowledge-requirement-end')
      }, attrs || {});

      return drawLine(p, element.waypoints, attrs);
    },
    'dmn:AuthorityRequirement': function(p, element, attrs) {

      attrs = assign({
        strokeWidth: 1.5,
        strokeDasharray: 5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        markerEnd: marker('authority-requirement-end')
      }, attrs || {});

      return drawLine(p, element.waypoints, attrs);
    }
  };


  // draw shape and connection ////////////////////////////////////
  function drawShape(parent, element) {
    var h = handlers[element.type];

    if (!h) {
      return BaseRenderer.prototype.drawShape.apply(this, [ parent, element ]);
    } else {
      return h(parent, element);
    }
  }

  function drawConnection(parent, element) {
    var type = element.type;
    var h = handlers[type];

    if (!h) {
      return BaseRenderer.prototype.drawConnection.apply(this, [ parent, element ]);
    } else {
      return h(parent, element);
    }
  }

  function drawLine(p, waypoints, attrs) {
    attrs = computeStyle(attrs, [ 'no-fill' ], {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'none'
    });

    return createLine(waypoints, attrs).appendTo(p);
  }

  this.canRender = function(element) {
    return is(element, 'dmn:DMNElement') ||
           is(element, 'dmn:InformationRequirement') ||
           is(element, 'dmn:KnowledgeRequirement') ||
           is(element, 'dmn:AuthorityRequirement');
  };

  this.drawShape = drawShape;
  this.drawConnection = drawConnection;


  // hook onto canvas init event to initialize
  // connection start/end markers on svg
  eventBus.on('canvas.init', function(event) {
    initMarkers(event.svg);
  });

}

inherits(DrdRenderer, BaseRenderer);

DrdRenderer.$inject = [ 'eventBus', 'pathMap', 'styles' ];

module.exports = DrdRenderer;


///////// helper functions /////////////////////////////
function getSemantic(element) {
  return element.businessObject;
}