using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class VucutOlculeriGenisletme : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "Weight",
                table: "BodyWeightLogs",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(6,2)",
                oldPrecision: 6,
                oldScale: 2);

            migrationBuilder.AddColumn<decimal>(
                name: "BodyFatPercent",
                table: "BodyWeightLogs",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WaistCm",
                table: "BodyWeightLogs",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_BodyWeightLog_BodyFatPercent_Positive",
                table: "BodyWeightLogs",
                sql: "\"BodyFatPercent\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BodyWeightLog_WaistCm_Positive",
                table: "BodyWeightLogs",
                sql: "\"WaistCm\" > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_BodyWeightLog_BodyFatPercent_Positive",
                table: "BodyWeightLogs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BodyWeightLog_WaistCm_Positive",
                table: "BodyWeightLogs");

            migrationBuilder.DropColumn(
                name: "BodyFatPercent",
                table: "BodyWeightLogs");

            migrationBuilder.DropColumn(
                name: "WaistCm",
                table: "BodyWeightLogs");

            migrationBuilder.AlterColumn<decimal>(
                name: "Weight",
                table: "BodyWeightLogs",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(6,2)",
                oldPrecision: 6,
                oldScale: 2,
                oldNullable: true);
        }
    }
}
