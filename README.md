# depedency-injection.js


```js
// -----------------------------
// App Bootstrap
// -----------------------------
const app = AppModule([LoggerModule, HttpModule, PatientModule, DatabaseModule])

async function main() {
  const logger = await use(LoggerService, app)
  const db = await use(Database, app)
  const patientService = await use(PatientService, app)

  logger.log("Is DB connected? " + db.isConnected())
  try {
    const patient = await patientService.getPatient("123")
    logger.log("Loaded patient: " + JSON.stringify(patient))
  } catch {
    logger.log("Patient fetch failed (demo only, no backend running)")
  }
}

main().catch(console.error)

```
