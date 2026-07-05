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

function normalizeKey(value) {
  return value ? value.toString().trim().toLowerCase() : "";
}

function parseAmountValue(value) {
  if (value === undefined || value === null || value === "") return 0;
  var parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

function parseAmountCell(value, displayValue) {
  if (typeof value === "number") return value;

  var parsedValue = parseAmountValue(value);
  if (parsedValue !== 0) return parsedValue;

  return parseAmountValue(displayValue);
}

function parseDateParam(value) {
  if (!value) return null;
  var parts = value.toString().split("-");
  if (parts.length !== 3) return null;

  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10) - 1;
  var day = parseInt(parts[2], 10);
  var date = new Date(year, month, day);

  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseTransactionDateValue(value) {
  if (!value) return null;

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  var raw = value.toString().trim();
  var isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }

  var ukMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ukMatch) {
    return new Date(parseInt(ukMatch[3], 10), parseInt(ukMatch[2], 10) - 1, parseInt(ukMatch[1], 10));
  }

  var parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function toDateKey(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function addDays(date, days) {
  var next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getRowAmount(row, displayRow, col) {
  if (col < 0 || col >= row.length) return 0;
  return parseAmountCell(row[col], displayRow[col]);
}

function getExpenseCategoriesFromTransactions(ss, limit) {
  var txSheet = ss.getSheetByName("Transactions");
  var categoriesByKey = {};
  if (!txSheet) return [];

  var allRows = txSheet.getDataRange().getValues();
  var expenseCount = 0;

  for (var i = allRows.length - 1; i >= 1 && expenseCount < limit; i--) {
    var row = allRows[i];
    var type = normalizeKey(row[2]);
    var category = row[4];
    var categoryKey = normalizeKey(category);

    if (type === "expense" && categoryKey) {
      categoriesByKey[categoryKey] = categoriesByKey[categoryKey] || {
        name: category.toString().trim(),
        recentCount: 0
      };
      categoriesByKey[categoryKey].recentCount++;
      expenseCount++;
    }
  }

  for (var j = allRows.length - 1; j >= 1; j--) {
    var oldRow = allRows[j];
    var oldType = normalizeKey(oldRow[2]);
    var oldCategory = oldRow[4];
    var oldCategoryKey = normalizeKey(oldCategory);

    if (oldType === "expense" && oldCategoryKey && !categoriesByKey[oldCategoryKey]) {
      categoriesByKey[oldCategoryKey] = {
        name: oldCategory.toString().trim(),
        recentCount: 0
      };
    }
  }

  return Object.keys(categoriesByKey).map(function(key) {
    return categoriesByKey[key];
  });
}

function getMonthlyCategoryDetails(sheet, categoryName) {
  var defaultDetails = {
    potMax: 0,
    spent: 0,
    left: 0
  };
  if (!sheet) return defaultDetails;

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return defaultDetails;

  var rows = sheet.getRange(1, 1, lastRow, 4).getValues();
  var displayRows = sheet.getRange(1, 1, lastRow, 4).getDisplayValues();
  var categoryKey = normalizeKey(categoryName);

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var displayRow = displayRows[i];
    var nameCell = row[0] || displayRow[0];

    if (normalizeKey(nameCell) === categoryKey) {
      var spent = getRowAmount(row, displayRow, 2); // Amount column C
      var potMax = getRowAmount(row, displayRow, 3); // Pot column D

      return {
        potMax: potMax,
        spent: spent,
        left: potMax - spent
      };
    }
  }

  return defaultDetails;
}

function getExpenseCategorySummaries(ss, month) {
  var sheet = ss.getSheetByName(month);
  if (!sheet) return null;

  var categories = getExpenseCategoriesFromTransactions(ss, 500).map(function(category) {
    var details = getMonthlyCategoryDetails(sheet, category.name);
    return {
      name: category.name,
      potMax: details.potMax,
      spent: details.spent,
      left: details.left,
      recentCount: category.recentCount
    };
  });

  categories.sort(function(a, b) {
    if (b.recentCount !== a.recentCount) {
      return b.recentCount - a.recentCount;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  return categories;
}

function getDailySpending(ss, fromParam, toParam) {
  var fromDate = parseDateParam(fromParam);
  var toDate = parseDateParam(toParam);

  if (!fromDate || !toDate) {
    return { status: "error", message: "Invalid date range" };
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return { status: "error", message: "From date must be before To date" };
  }

  var maxDays = 370;
  var dayCount = Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  if (dayCount > maxDays) {
    return { status: "error", message: "Date range is too large" };
  }

  var dailyTotals = {};
  var days = [];
  for (var cursor = new Date(fromDate); cursor.getTime() <= toDate.getTime(); cursor = addDays(cursor, 1)) {
    var key = toDateKey(cursor);
    dailyTotals[key] = 0;
    days.push({
      date: key,
      label: Utilities.formatDate(cursor, Session.getScriptTimeZone(), "EEE d MMM"),
      amount: 0
    });
  }

  var txSheet = ss.getSheetByName("Transactions");
  if (!txSheet) {
    return {
      status: "ok",
      from: toDateKey(fromDate),
      to: toDateKey(toDate),
      total: 0,
      data: days
    };
  }

  var rows = txSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var type = normalizeKey(row[2]);
    if (type !== "expense") continue;

    var txDate = parseTransactionDateValue(row[3] || row[0]);
    if (!txDate) continue;
    txDate.setHours(0, 0, 0, 0);

    if (txDate.getTime() < fromDate.getTime() || txDate.getTime() > toDate.getTime()) continue;

    var txKey = toDateKey(txDate);
    if (dailyTotals[txKey] === undefined) continue;
    dailyTotals[txKey] += parseFloat(row[5]) || 0;
  }

  var total = 0;
  days.forEach(function(day) {
    day.amount = dailyTotals[day.date] || 0;
    total += day.amount;
  });

  return {
    status: "ok",
    from: toDateKey(fromDate),
    to: toDateKey(toDate),
    total: total,
    data: days
  };
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

    // 2. Handle daily spending totals for analytics date ranges
    if (action === "getDailySpending") {
      return jsonResponse(getDailySpending(ss, e.parameter.from, e.parameter.to));
    }

    // 3. Handle expense category dropdown order and selected category pot details
    if (action === "getExpenseCategories") {
      if (!month) return jsonResponse({status: "error", message: "Missing month"});

      var categories = getExpenseCategorySummaries(ss, month);
      if (categories === null) return jsonResponse({status: "error", message: "Month tab not found"});

      return jsonResponse({
        status: "ok",
        month: month,
        categories: categories
      });
    }

    // 4. Handle Latest Transactions List
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

    // 5. Handle Home Page Balance (E13/F13/G13 — Left, Scheduled Left, Forecast Left)
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