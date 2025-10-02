document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const month = document.getElementById("monthSelect").value;

    startProgress();
    await sendData("expense", formData, month);
    finishProgress();

    const msg = e.target.querySelector(".message");
    msg.textContent = "Expense added ✅";
    msg.className = "message success";
    e.target.reset();
});

