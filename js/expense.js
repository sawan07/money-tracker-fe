document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const month = document.getElementById("monthSelect").value;
    const selectedCategory = formData.get("category");

    startProgress();
    await sendData("expense", formData, month);
    finishProgress();

    const msg = e.target.querySelector(".message");
    msg.textContent = "Expense added ✅";
    msg.className = "message success";
    e.target.reset();
    fetchBalance(month);
    if (typeof refreshExpenseCategories === "function") {
        refreshExpenseCategories(month, selectedCategory);
    }
});

