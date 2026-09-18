using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class VucutOlculeriBoyKalca : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "HeightCm",
                table: "BodyWeightLogs",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HipCm",
                table: "BodyWeightLogs",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_BodyWeightLog_HeightCm_Positive",
                table: "BodyWeightLogs",
                sql: "\"HeightCm\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BodyWeightLog_HipCm_Positive",
                table: "BodyWeightLogs",
                sql: "\"HipCm\" > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_BodyWeightLog_HeightCm_Positive",
                table: "BodyWeightLogs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BodyWeightLog_HipCm_Positive",
                table: "BodyWeightLogs");

            migrationBuilder.DropColumn(
                name: "HeightCm",
                table: "BodyWeightLogs");

            migrationBuilder.DropColumn(
                name: "HipCm",
                table: "BodyWeightLogs");
        }
    }
}
