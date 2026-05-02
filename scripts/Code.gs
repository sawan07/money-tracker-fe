function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    var month = data.month;       
    var type = data.type;         
    var date = data.date;
    var amount = parseFloat(data.amount);
    var category = data.category || "";
    var source = data.source || "";
    var notes = data.notes || "";

    var sheet = ss.getSheetByName(month);
    if (!sheet) return jsonResponse({status: "error", message: "Month tab not found: " + month});

    var catNorm = category.toString().trim().toLowerCase();
    var srcNorm = source.toString().trim().toLowerCase();

    if (type === "expense") {
      var values = sheet.getRange("A:A").getValues();
      for (var i = 0; i < values.length; i++) {
        if (values[i][0] && values[i][0].toString().trim().toLowerCase() === catNorm) {
          var currentValue = sheet.getRange(i+1, 3).getValue();
          sheet.getRange(i+1, 3).setValue((parseFloat(currentValue) || 0) + amount);
          break;
        }
      }
    } else if (type === "earning") {
      var values = sheet.getRange("J:J").getValues();
      var earningFound = false;
      for (var j = 0; j < values.length; j++) {
        if (values[j][0] && values[j][0].toString().trim().toLowerCase() === srcNorm) {
          var currentValue = sheet.getRange(j+1, 11).getValue();
          sheet.getRange(j+1, 11).setValue((parseFloat(currentValue) || 0) + amount);
          earningFound = true;
          break;
        }
      }
      if (!earningFound) {
        var insertEarn = -1;
        for (var ej = 0; ej < values.length; ej++) {
          if (!values[ej][0] || values[ej][0].toString().trim() === "") {
            insertEarn = ej + 1;
            break;
          }
        }
        if (insertEarn === -1) {
          insertEarn = sheet.getLastRow() + 1;
        }
        sheet.getRange(insertEarn, 10).setValue(source);
        sheet.getRange(insertEarn, 11).setValue(amount);
      }
    }

    var logSheet = ss.getSheetByName("Transactions");
    if (!logSheet) {
      logSheet = ss.insertSheet("Transactions");
      logSheet.appendRow(["Timestamp", "Month", "Type", "Date", "Category/Source", "Amount", "Notes"]);
    }
    logSheet.appendRow([new Date(), month, type, date, type === "expense" ? category : source, amount, notes]);

    return jsonResponse({status: "success"});
  } catch (err) {
    return jsonResponse({status: "error", message: err.toString()});
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action;
    var month = e.parameter.month;

    // 1. Handle Analytics Graph Data
    if (action === "getChartData") {
      var logSheet = ss.getSheetByName("Transactions");
      if (!logSheet) return jsonResponse({status: "error", message: "No Transactions sheet"});
      
      var rows = logSheet.getDataRange().getValues();
      rows.shift(); // Remove headers
      
      var summary = {};
      rows.forEach(row => {
        var rType = row[2], rMonth = row[1], rCat = row[4], rAmt = parseFloat(row[5]) || 0;
        if (rType === "expense") {
          if (!summary[rMonth]) summary[rMonth] = {};
          summary[rMonth][rCat] = (summary[rMonth][rCat] || 0) + rAmt;
        }
      });
      return jsonResponse({status: "ok", data: summary});
    }

    // 2. Handle Latest Transactions List
    if (action === "getLatestTransactions") {
      var txSheet = ss.getSheetByName("Transactions");
      if (!txSheet) return jsonResponse({status: "ok", data: []});

      var allRows = txSheet.getDataRange().getValues();
      if (allRows.length <= 1) return jsonResponse({status: "ok", data: []});

      allRows.shift(); // remove headers

      var latestRows = allRows.slice(-10).reverse();
      var transactions = latestRows.map(function(row) {
        return {
          timestamp: row[0],
          month: row[1],
          type: row[2],
          date: row[3],
          categoryOrSource: row[4],
          amount: parseFloat(row[5]) || 0,
          notes: row[6] || ""
        };
      });

      return jsonResponse({status: "ok", data: transactions});
    }

    // 3. Handle Home Page Balance (E13/F13/G13 — Left, Scheduled Left, Forecast Left)
    if (month) {
      var sheet = ss.getSheetByName(month);
      if (!sheet) return jsonResponse({status: "error", message: "Month tab not found"});
      var left = sheet.getRange("E13").getValue();
      var scheduledLeft = sheet.getRange("F13").getValue();
      var forecastLeft = sheet.getRange("G13").getValue();
      return jsonResponse({
        status: "ok",
        month: month,
        remaining: left,
        left: left,
        scheduledLeft: scheduledLeft,
        forecastLeft: forecastLeft
      });
    }

    return jsonResponse({status: "error", message: "Missing parameters"});
  } catch (err) {
    return jsonResponse({status: "error", message: err.toString()});
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}