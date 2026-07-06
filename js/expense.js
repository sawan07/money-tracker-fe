document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const month = document.getElementById("monthSelect").value;
    const selectedCategory = formData.get("category");
    const msg = e.target.querySelector(".message");

    startProgress();
    try {
        await sendData("expense", formData, month);
        finishProgress();
        msg.textContent = "Expense added ✅";
        msg.className = "message success";
        e.target.reset();
        fetchBalance(month);
        if (typeof loadHomeTransactions === "function") loadHomeTransactions();
        if (typeof refreshExpenseCategories === "function") {
            refreshExpenseCategories(month, selectedCategory);
        }
        if (typeof updateExpenseConditionalFields === "function") {
            updateExpenseConditionalFields(selectedCategory);
        }
    } catch (error) {
        finishProgress();
        msg.textContent = error.message || "Could not add expense";
        msg.className = "message error";
    }
});
