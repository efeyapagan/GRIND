using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AiInsightAralikAlanlari : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "RangeFrom",
                table: "AiInsights",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "RangeTo",
                table: "AiInsights",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RangeFrom",
                table: "AiInsights");

            migrationBuilder.DropColumn(
                name: "RangeTo",
                table: "AiInsights");
        }
    }
}
