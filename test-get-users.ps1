# Test Get All Users API
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZSI6Ijk3MDE1MzMzNjIiLCJpYXQiOjE3NTM3MTk3MTMsImV4cCI6MTc1Mzc0ODUxM30.1xUcTl-nS93geUhD87VDuv2wdJRNWHn3jP8qMUvWkNE"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method GET -Headers $headers
    Write-Host "Response:" -ForegroundColor Green
    Write-Host "Total Users: $($response.data.Count)"
    $response.data | Select-Object id, name, phone, emailID, designation_name, salary, allowance | Format-Table
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
