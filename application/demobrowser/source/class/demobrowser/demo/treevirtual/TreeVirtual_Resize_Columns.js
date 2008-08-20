/**
 * Demonstrate providing initially-selected tree nodes.
 */
qx.Class.define("BasicSample",
{
  extend : qx.application.Gui,

  members :
  {
    main : function()
    {
      this.base(arguments);
      // We want to use some of the high-level node operation convenience
      // methods rather than manually digging into the TreeVirtual helper
      // classes.  Include the mixin that provides them.
      qx.Class.include(qx.ui.treevirtual.TreeVirtual,
                       qx.ui.treevirtual.MNode);
      
      // tree
      var tree = new qx.ui.treevirtual.TreeVirtual(["Tree", "Data"]);
      tree.set({
              left   : 10,
              right  : 300,
              top    : 30,
              bottom : '50%',
              border : "inset-thin"
            });
      tree.setColumnWidth(0, 400);
      tree.setColumnWidth(1, 100);
      tree.setAlwaysShowOpenCloseSymbol(true);
  
      tree.setSelectionMode(
                qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);
  
      // Add the tree to the document
      tree.addToDocument();
  
      // tree data model
      var dataModel = tree.getDataModel();
      var te1 = dataModel.addBranch(null, "Desktop", true);
      dataModel.addBranch(te1, "Files", true);
      var te = dataModel.addBranch(te1, "Workspace", true);
      var x = dataModel.addLeaf(te, "Windows (C:)");
      tree.nodeSetSelected(x, true);
      x = dataModel.addLeaf(te, "Documents (D:)");
      tree.nodeSetSelected(x, true);
      var te2 = dataModel.addBranch(null, "Inbox", true);
      te = dataModel.addBranch(te2, "Spam", true);
      for (var i = 1; i < 3000; i++)
      {
        dataModel.setColumnData(dataModel.addLeaf(te, "Spam Message #" + i),
                                1,
                                'Data #'+i);
      }
      dataModel.setData();
  
      var nextId = 0;
      var createRandomRows = function(rowCount) {
        var rowData = [];
        var now = new Date().getTime();
        var dateRange = 400 * 24 * 60 * 60 * 1000; // 400 days
        for (var row = 0; row < rowCount; row++) {
          var date = new Date(now + Math.random() * dateRange - dateRange / 2);
          rowData.push([
                         nextId++,
                         Math.random() * 10000,
                         date,
                         (Math.random() > 0.5)
                       ]);
        }
        return rowData;
      };
  
      // Create the initial data
      var rowData = createRandomRows(50);
  
      // table model
      var tableModel = new qx.ui.table.model.Simple();
      tableModel.setColumns([ "ID", "A number", "A date", "Boolean test" ]);
      tableModel.setData(rowData);
      tableModel.setColumnEditable(1, true);
      tableModel.setColumnEditable(2, true);
  
      // table
      var table = new qx.ui.table.Table(tableModel);
      table.set({ left: 10, right: 300, top: '55%', bottom: 30, border:"inset-thin" });
      var selectionMode =
        qx.ui.table.selection.Model.MULTIPLE_INTERVAL_SELECTION;
      table.getSelectionModel().setSelectionMode(selectionModel);
  
      var rtcm = new qx.ui.table.columnmodel.Resize();
      table.setTableColumnModel(rtcm);
      var resizeBehavior = rtcm.getBehavior();
      resizeBehavior.set(0, { width:"1*", minWidth:40, maxWidth:80  });
      resizeBehavior.setWidth(1, "50%");
      resizeBehavior.setMinWidth(1, 100);
      resizeBehavior.setMaxWidth(1, 320);
      resizeBehavior.set(3, { width:100 });

      // Display a checkbox in column 3
      rtcm.setDataCellRenderer(3, new qx.ui.table.cellrenderer.Boolean());
      
      table.addToDocument();
    }
  }
});
