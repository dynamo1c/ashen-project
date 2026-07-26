const catalyst = require('zcatalyst-sdk-node');

async function test() {
  try {
    const catalystApp = catalyst.initialize();
    
    console.log("Executing Total FIRs count...");
    const firCountQuery = "SELECT COUNT(fir_number) FROM FIR_Records";
    const firCountResult = await catalystApp.zcql().executeZCQLQuery(firCountQuery);
    console.log("FIR COUNT RESULT:", JSON.stringify(firCountResult, null, 2));

    console.log("Executing Total Offenders count...");
    const offenderCountQuery = "SELECT COUNT(offender_id) FROM Offenders";
    const offenderCountResult = await catalystApp.zcql().executeZCQLQuery(offenderCountQuery);
    console.log("OFFENDER COUNT RESULT:", JSON.stringify(offenderCountResult, null, 2));

    console.log("Executing Category count...");
    const categoryQuery = "SELECT crime_head, COUNT(fir_number) FROM FIR_Records GROUP BY crime_head";
    const categoryResult = await catalystApp.zcql().executeZCQLQuery(categoryQuery);
    console.log("CATEGORY RESULT:", JSON.stringify(categoryResult, null, 2));

  } catch (err) {
    console.error("Error running test:", err);
  }
}

test();
