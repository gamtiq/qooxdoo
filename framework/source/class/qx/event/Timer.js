/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)

************************************************************************ */

/**
 * Global timer support.
 *
 * This class can be used to periodically fire an event. This event can be
 * used to simulate e.g. a background task. The static method
 * {@link #once} is a special case. It will call a function deferred after a
 * given timeout.
 */
qx.Class.define("qx.event.Timer",
{
  extend : qx.core.Object,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param interval {Number} initial interval in milliseconds of the timer.
   */
  construct : function(interval)
  {
    this.base(arguments);

    this.setEnabled(false);

    if (interval != null) {
      this.setInterval(interval);
    }

    // don't use qx.lang.Function.bind because this function would add a
    // disposed check, which could break the functionality. In IE the handler
    // may get called after "clearInterval" (i.e. after the timer is disposed)
    // and we must be able to handle this.
    var self = this;
    this.__oninterval = function() {
      self._oninterval.call(self);
      if (self.isEnabled() && self.isUseSetTimeout()) {
        self.__intervalHandler = setTimeout(self.__oninterval, self.getInterval());
      }
    }
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** This event if fired each time the interval time has elapsed */
    "interval" : "qx.event.type.Event"
  },





  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * Start a function after a given timeout.
     *
     * @param func {Function} Function to call
     * @param obj {Object} context (this), the function is called with
     * @param timeout {Number} Number of milliseconds to wait before the
     *   function is called.
     * @return {qx.event.Timer} The timer object used for the timeout. This
     *    object can be used to cancel the timeout. Note that the timer is
     *    only valid until the timer has been executed.
     */
    once : function(func, obj, timeout)
    {
      if (qx.core.Environment.get("qx.debug")) {
        // check the given parameter
        qx.core.Assert.assertFunction(func, "func is not a function");
        qx.core.Assert.assertNotUndefined(timeout, "No timeout given");
      }

      // Create time instance
      var timer = new qx.event.Timer(timeout);

      // Bug #3481: append original function to timer instance so it can be
      // read by a debugger
      timer.__onceFunc = func;

      // Add event listener to interval
      timer.addListener("interval", function(e)
      {
        timer.stop();
        func.call(obj, e);
        timer.dispose();

        obj = null;
      },
      obj);

      // Directly start timer
      timer.start();
      return timer;
    }
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * With the enabled property the Timer can be started and suspended.
     * Setting it to "true" is equivalent to {@link #start}, setting it
     * to "false" is equivalent to {@link #stop}.
     */
    enabled :
    {
      init : true,
      check : "Boolean",
      apply : "_applyEnabled"
    },

    /**
     * Time in milliseconds between two callback calls.
     * This property can be set to modify the interval of
     * a running timer.
     */
    interval :
    {
      check : "Integer",
      init : 1000,
      apply : "_applyInterval"
    },

    /**
     * Specifies whether setTimeout ("true" value) or setInterval ("false" value) should be used to generate timer events.
     */
    useSetTimeout :
    {
      init : false,
      check : "Boolean",
      apply : "_applyUseSetTimeout"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __intervalHandler : null,
    __oninterval : null,



    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    /**
     * Apply the interval of the timer.
     *
     * @param value {var} Current value
     * @param old {var} Previous value
     */
    _applyInterval : function(value, old)
    {
      if (this.getEnabled()) {
        this.restart();
      }
    },


    /**
     * Apply the enabled state of the timer.
     *
     * @param value {var} Current value
     * @param old {var} Previous value
     */
    _applyEnabled : function(value, old)
    {
      if (old)
      {
        window[this.isUseSetTimeout() ? "clearTimeout" : "clearInterval"](this.__intervalHandler);
        this.__intervalHandler = null;
      }
      else if (value)
      {
        this.__intervalHandler = window[this.isUseSetTimeout() ? "setTimeout" : "setInterval"](this.__oninterval, this.getInterval());
      }
    },


    /**
     * Apply the <code>useSetTimeout</code> of the timer.
     *
     * @param value {var} Current value
     * @param old {var} Previous value
     */
    _applyUseSetTimeout : function(value, old)
    {
      if (this.getEnabled()) {
        this.restart();
      }
    },




    /*
    ---------------------------------------------------------------------------
      USER-ACCESS
    ---------------------------------------------------------------------------
    */

    /**
     * Start the timer
     *
     */
    start : function() {
      this.setEnabled(true);
    },


    /**
     * Start the timer with a given interval
     *
     * @param interval {Integer} Time in milliseconds between two callback calls.
     */
    startWith : function(interval)
    {
      this.setInterval(interval);
      this.start();
    },


    /**
     * Stop the timer.
     *
     */
    stop : function() {
      this.setEnabled(false);
    },


    /**
     * Restart the timer.
     * This makes it possible to change the interval of a running timer.
     *
     * @param runTimerCallback {Boolean ? false} Whether timer callback should be run immediately as if timer interval has elapsed.
     */
    restart : function(runTimerCallback)
    {
      if (runTimerCallback) {
        this._oninterval();
      }
      this.stop();
      this.start();
    },


    /**
     * Restart the timer. with a given interval.
     *
     * @param interval {Integer} Time in milliseconds between two callback calls.
     * @param runTimerCallback {Boolean ? false} Whether timer callback should be run immediately as if timer interval has elapsed.
     */
    restartWith : function(interval, runTimerCallback)
    {
      if (runTimerCallback) {
        this._oninterval();
      }
      this.stop();
      this.startWith(interval);
    },




    /*
    ---------------------------------------------------------------------------
      EVENT-MAPPER
    ---------------------------------------------------------------------------
    */

    /**
     * timer callback
     *
     * @signature function()
     */
    _oninterval : qx.event.GlobalError.observeMethod(function()
    {
      if (this.$$disposed) {
        return;
      }

      if (this.getEnabled()) {
        this.fireEvent("interval");
      }
    })
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    if (this.__intervalHandler) {
      window.clearInterval(this.__intervalHandler);
    }

    this.__intervalHandler = this.__oninterval = null;
  }
});
